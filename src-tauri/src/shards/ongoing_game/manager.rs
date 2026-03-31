use std::collections::HashMap;
use std::sync::Arc;

use serde_json::Value;
use tokio::sync::{broadcast, Mutex};

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::events::champ_select_session::{
    ChampSelectSession, ChampSelectSessionData, TeamMember as ChampSelectTeamMember,
};
use crate::shards::lcu::events::gameflow_phase::Phase as GameflowPhase;
use crate::shards::lcu::events::gameflow_session::{GameflowSession, GameflowSessionData};
use crate::shards::lcu::events::{
    EventType, LcuWsEvent, URI_CHAMP_SELECT_SESSION, URI_GAMEFLOW_SESSION,
};
use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::summoner::SummonerInfo;
use crate::shards::ongoing_game::types::{OngoingGameEvent, OngoingGamePhase, OngoingGameUpdated};
use crate::shards::settings::SettingHandle;
use crate::shards::sgp::matches::RawMatchSummaryGame;
use crate::shards::sgp::session::SgpSession;

use super::driver::{spawn_per_player_history_fetches, OngoingGameDriver};

pub(crate) const DEFAULT_MATCH_HISTORY_COUNT: u32 = 50;
const QUEUE_MODE_ALL_VALUE: &str = "__all__";

#[derive(Clone)]
pub struct OngoingGameManagerSettings {
    pub match_history_count: SettingHandle,
    pub match_history_tag: SettingHandle,
}

impl OngoingGameManagerSettings {
    pub fn match_history_count_value(&self) -> u32 {
        self.match_history_count
            .get_value()
            .ok()
            .as_ref()
            .and_then(parse_match_history_count)
            .unwrap_or(DEFAULT_MATCH_HISTORY_COUNT)
    }

    pub fn match_history_tag_value(&self) -> Option<String> {
        self.match_history_tag
            .get_value()
            .ok()
            .as_ref()
            .and_then(parse_queue_mode_to_tag)
    }
}

#[derive(Clone)]
pub struct OngoingGameManager {
    pub(crate) ctx: Arc<OngoingGameContext>,
}

impl OngoingGameManager {
    pub(crate) fn new(settings: OngoingGameManagerSettings) -> Self {
        Self {
            ctx: Arc::new(OngoingGameContext::new(settings)),
        }
    }

    pub async fn handle_ws_event(&self, event: LcuWsEvent) {
        let mut state = self.ctx.state.lock().await;

        match &event {
            LcuWsEvent::GameflowSession(payload) => {
                state.cached_gameflow_session = Some(payload.data.clone());
                if has_gameflow_team_data(&payload.data) {
                    state.cached_team_members = ManagerState::extract_gameflow_members(&payload.data);
                }
            }
            LcuWsEvent::ChampSelectSession(payload) => {
                state.cached_champ_select_session = Some(payload.data.clone());
                state.cached_team_members = ManagerState::extract_champ_select_members(&payload.data);
            }
            _ => {}
        }

        if let Some(ref mut driver) = state.driver {
            driver.process(&event);
        }
    }

    pub async fn handle_focus_changed(
        &self,
        lcu_session: Option<Arc<LcuSession>>,
        sgp_session: Option<Arc<SgpSession>>,
    ) {
        let expected_focus = lcu_focus_key(lcu_session.as_ref());
        let updated = {
            let mut state = self.ctx.state.lock().await;
            state.lcu_session = lcu_session.clone();
            state.sgp_session = sgp_session;
            state.driver = Some(OngoingGameDriver::new(self.ctx.clone()));
            state.clear_caches();
            state.build_updated_payload(&self.ctx.settings)
        };

        self.ctx.broadcast(OngoingGameEvent::Updated(updated));

        let Some(lcu_session) = lcu_session else {
            return;
        };

        let manager = self.clone();
        tokio::spawn(async move {
            manager
                .seed_from_current_session(expected_focus, lcu_session)
                .await;
        });
    }

    pub async fn has_same_lcu_focus(&self, lcu_session: Option<&Arc<LcuSession>>) -> bool {
        let state = self.ctx.state.lock().await;
        lcu_focus_key(state.lcu_session.as_ref()) == lcu_focus_key(lcu_session)
    }

    pub async fn refresh_current(&self) {
        let updated = {
            let state = self.ctx.state.lock().await;
            state.build_updated_payload(&self.ctx.settings)
        };

        self.ctx.broadcast(OngoingGameEvent::Updated(updated));
        self.refresh_match_histories().await;
    }

    pub async fn refresh_match_histories(&self) {
        let count = self.ctx.settings.match_history_count_value();
        let tag = self.ctx.settings.match_history_tag_value();

        let (puuids, sgp) = {
            let mut state = self.ctx.state.lock().await;
            state.cached_match_histories.clear();
            let puuids = state.team_puuids();
            let sgp = state.sgp_session.clone();
            (puuids, sgp)
        };

        spawn_per_player_history_fetches(&self.ctx, &sgp, &puuids, count, tag.as_deref());
    }

    pub fn subscribe(&self) -> broadcast::Receiver<OngoingGameEvent> {
        self.ctx.event_tx.subscribe()
    }

    async fn seed_from_current_session(
        &self,
        expected_focus: Option<(u32, u16)>,
        lcu_session: Arc<LcuSession>,
    ) {
        let Ok(seed) = lcu_session.api().get_ongoing_session_seed().await else {
            return;
        };

        let seed_events = seed_to_ws_events(&seed);
        if seed_events.is_empty() {
            return;
        }

        for event in seed_events {
            if !self.current_focus_matches(expected_focus).await {
                return;
            }
            self.handle_ws_event(event).await;
        }

        if !self.current_focus_matches(expected_focus).await {
            return;
        }

        let updated = {
            let state = self.ctx.state.lock().await;
            state.build_updated_payload(&self.ctx.settings)
        };
        self.ctx.broadcast(OngoingGameEvent::Updated(updated));
    }

    async fn current_focus_matches(&self, expected_focus: Option<(u32, u16)>) -> bool {
        let state = self.ctx.state.lock().await;
        lcu_focus_key(state.lcu_session.as_ref()) == expected_focus
    }
}

pub struct OngoingGameContext {
    pub(crate) settings: OngoingGameManagerSettings,
    pub(crate) state: Mutex<ManagerState>,
    pub(crate) event_tx: broadcast::Sender<OngoingGameEvent>,
}

impl OngoingGameContext {
    fn new(settings: OngoingGameManagerSettings) -> Self {
        let (event_tx, _) = broadcast::channel(64);
        Self {
            settings,
            state: Mutex::new(ManagerState::new()),
            event_tx,
        }
    }

    pub(crate) fn broadcast(&self, event: OngoingGameEvent) {
        let _ = self.event_tx.send(event);
    }
}

pub(crate) struct ManagerState {
    pub(crate) driver: Option<OngoingGameDriver>,
    pub(crate) lcu_session: Option<Arc<LcuSession>>,
    pub(crate) sgp_session: Option<Arc<SgpSession>>,
    pub(crate) cached_gameflow_session: Option<GameflowSessionData>,
    pub(crate) cached_champ_select_session: Option<ChampSelectSessionData>,
    pub(crate) cached_summoners_by_puuid: HashMap<String, SummonerInfo>,
    pub(crate) cached_match_histories: HashMap<String, Vec<RawMatchSummaryGame>>,
    pub(crate) cached_team_members: Vec<ChampSelectTeamMember>,
}

impl ManagerState {
    fn new() -> Self {
        Self {
            driver: None,
            lcu_session: None,
            sgp_session: None,
            cached_gameflow_session: None,
            cached_champ_select_session: None,
            cached_summoners_by_puuid: HashMap::new(),
            cached_match_histories: HashMap::new(),
            cached_team_members: Vec::new(),
        }
    }

    pub(crate) fn clear_caches(&mut self) {
        self.cached_gameflow_session = None;
        self.cached_champ_select_session = None;
        self.cached_summoners_by_puuid.clear();
        self.cached_match_histories.clear();
        self.cached_team_members.clear();
    }

    pub(crate) fn build_updated_payload(
        &self,
        settings: &OngoingGameManagerSettings,
    ) -> OngoingGameUpdated {
        let phase = self
            .driver
            .as_ref()
            .map(|d| d.current_phase())
            .unwrap_or(OngoingGamePhase::Idle);

        OngoingGameUpdated {
            phase,
            match_history_tag: settings.match_history_tag_value(),
            gameflow_session: self.cached_gameflow_session.clone(),
            champ_select_session: self.cached_champ_select_session.clone(),
            team_members: self.cached_team_members.clone(),
        }
    }

    pub(crate) fn team_puuids(&self) -> Vec<String> {
        self.cached_team_members
            .iter()
            .map(|m| m.puuid.clone())
            .filter(|p| !is_bot_puuid(p))
            .collect()
    }

    pub(crate) fn new_puuids(&self) -> Vec<String> {
        self.team_puuids()
            .into_iter()
            .filter(|p| !self.cached_summoners_by_puuid.contains_key(p))
            .collect()
    }

    pub(crate) fn new_history_puuids(&self) -> Vec<String> {
        self.team_puuids()
            .into_iter()
            .filter(|p| !self.cached_match_histories.contains_key(p))
            .collect()
    }

    pub(crate) fn extract_champ_select_members(
        session: &ChampSelectSessionData,
    ) -> Vec<ChampSelectTeamMember> {
        let mut members = session.my_team.clone();
        members.extend(session.their_team.clone());
        members
    }

    pub(crate) fn extract_gameflow_members(
        session: &GameflowSessionData,
    ) -> Vec<ChampSelectTeamMember> {
        let mut members = Vec::new();
        for team in [&session.game_data.team_one, &session.game_data.team_two] {
            for t in team {
                members.push(ChampSelectTeamMember {
                    puuid: t.puuid.clone(),
                    champion_id: t.champion_id,
                    summoner_id: t.summoner_id as i64,
                    team: t.team_participant_id,
                    assigned_position: Some(t.selected_position.clone()),
                    game_name: t.summoner_name.clone(),
                    internal_name: t.summoner_internal_name.clone(),
                    ..Default::default()
                });
            }
        }
        members
    }
}

fn lcu_focus_key(session: Option<&Arc<LcuSession>>) -> Option<(u32, u16)> {
    session.map(|entry| (entry.auth().pid, entry.auth().port))
}

fn has_gameflow_team_data(session: &GameflowSessionData) -> bool {
    !session.game_data.team_one.is_empty() || !session.game_data.team_two.is_empty()
}

fn seed_to_ws_events(seed: &OngoingSessionSeed) -> Vec<LcuWsEvent> {
    let mut events = Vec::new();

    if let Some(ref champ_select) = seed.champ_select_session {
        events.push(LcuWsEvent::ChampSelectSession(ChampSelectSession {
            event_type: EventType::Update,
            uri: URI_CHAMP_SELECT_SESSION.to_string(),
            data: champ_select.clone(),
        }));
    }

    if let Some(ref gameflow) = seed.gameflow_session {
        events.push(LcuWsEvent::GameflowSession(GameflowSession {
            event_type: EventType::Update,
            uri: URI_GAMEFLOW_SESSION.to_string(),
            data: gameflow.clone(),
        }));
    } else if should_seed_phase_event(seed.phase) {
        let data = GameflowSessionData {
            phase: seed.phase,
            ..Default::default()
        };
        events.push(LcuWsEvent::GameflowSession(GameflowSession {
            event_type: EventType::Update,
            uri: URI_GAMEFLOW_SESSION.to_string(),
            data,
        }));
    }

    events
}

fn should_seed_phase_event(phase: GameflowPhase) -> bool {
    matches!(
        phase,
        GameflowPhase::ChampSelect
            | GameflowPhase::GameStart
            | GameflowPhase::InProgress
            | GameflowPhase::InGame
    )
}

fn is_bot_puuid(puuid: &str) -> bool {
    let p = puuid.trim();
    p.is_empty() || p.eq_ignore_ascii_case("BOT") || p.to_uppercase().starts_with("BOT_")
}

fn parse_match_history_count(value: &Value) -> Option<u32> {
    if let Some(raw) = value.as_u64() {
        return Some((raw as u32).clamp(1, 200));
    }

    if let Some(raw) = value.as_i64() {
        if raw > 0 {
            return Some((raw as u32).clamp(1, 200));
        }
    }

    None
}

fn parse_queue_mode_to_tag(value: &Value) -> Option<String> {
    let raw = value.as_str()?.trim();
    if raw.is_empty() || raw == QUEUE_MODE_ALL_VALUE || raw.eq_ignore_ascii_case("all") {
        return None;
    }

    Some(raw.to_string())
}
