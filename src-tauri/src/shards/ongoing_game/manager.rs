use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use serde_json::Value;
use tokio::sync::{broadcast, Mutex, Semaphore};
use tokio::task::JoinSet;

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::events::champ_select_session::{
    ChampSelectSession, ChampSelectSessionData, TeamMember as ChampSelectTeamMember,
};
use crate::shards::lcu::events::gameflow_phase::Phase as GameflowPhase;
use crate::shards::lcu::events::gameflow_session::{GameflowSession, GameflowSessionData};
use crate::shards::lcu::events::teambuilder_tbd_game::{
    TeambuilderCell, TeambuilderTbdGamePayload,
};
use crate::shards::lcu::events::{
    EventType, LcuWsEvent, URI_CHAMP_SELECT_SESSION, URI_GAMEFLOW_SESSION,
};
use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::summoner::SummonerInfo;
use crate::shards::ongoing_game::types::{
    OngoingGameEvent, OngoingGameMatchHistoryState, OngoingGamePhase,
    OngoingGamePlayerLoadStatus, OngoingGameSummonerState, OngoingGameUpdated,
};
use crate::shards::settings::SettingHandle;
use crate::shards::sgp::matches::RawMatchSummaryGame;
use crate::shards::sgp::LcuSessionSgpExt;
use crate::shards::sgp::SgpShard;

use super::driver::OngoingGameDriver;

pub(crate) const DEFAULT_MATCH_HISTORY_COUNT: u32 = 50;
pub(crate) const MAX_MATCH_HISTORY_FETCH_CONCURRENCY: usize = 3;
const BOT_PUUID: &str = "BOT";
const QUEUE_MODE_CURRENT_VALUE: &str = "__current_mode__";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MatchHistoryModeSetting {
    All,
    CurrentMode,
    FixedTag(String),
}

impl MatchHistoryModeSetting {
    fn payload_value(&self) -> Option<String> {
        match self {
            Self::All => None,
            Self::CurrentMode => Some(QUEUE_MODE_CURRENT_VALUE.to_string()),
            Self::FixedTag(tag) => Some(tag.clone()),
        }
    }

    fn effective_tag(&self, effective_queue_id: Option<u64>) -> Option<String> {
        match self {
            Self::All => None,
            Self::CurrentMode => effective_queue_id.map(|queue_id| format!("q_{queue_id}")),
            Self::FixedTag(tag) => Some(tag.clone()),
        }
    }
}

#[derive(Clone)]
pub struct OngoingGameManagerSettings {
    pub match_history_count: SettingHandle,
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
}

#[derive(Clone)]
pub struct OngoingGameManager {
    pub(crate) ctx: Arc<OngoingGameContext>,
}

impl OngoingGameManager {
    pub(crate) fn new(settings: OngoingGameManagerSettings, sgp_shard: Arc<SgpShard>) -> Self {
        Self {
            ctx: Arc::new(OngoingGameContext::new(settings, sgp_shard)),
        }
    }

    pub async fn handle_ws_event(&self, event: LcuWsEvent) {
        let mut state = self.ctx.state.lock().await;

        match &event {
            LcuWsEvent::GameflowSession(payload) => {
                let event_game_id = extract_gameflow_game_id(&payload.data);
                state.sync_lifecycle_game_id(event_game_id, "gameflow_session");
                state.cached_gameflow_session = Some(payload.data.clone());
                if has_gameflow_team_data(&payload.data)
                    && should_apply_gameflow_members(payload.data.phase)
                    && payload.event_type != EventType::Delete
                    && state.can_apply_member_snapshot(event_game_id)
                {
                    let next_members =
                        if state.should_merge_locked_teambuilder_roster(&payload.data) {
                            state.merge_gameflow_with_locked_teambuilder_members(&payload.data)
                        } else {
                            ManagerState::extract_gameflow_members(&payload.data)
                        };
                    tracing::info!(
                        "[ongoing_game] team snapshot source=gameflow phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} members={}",
                        payload.data.phase,
                        payload.event_type,
                        event_game_id,
                        state.lifecycle_game_id,
                        next_members.len()
                    );
                    state.cached_team_members = next_members;
                } else if has_gameflow_team_data(&payload.data) {
                    tracing::info!(
                        "[ongoing_game] team snapshot source=unchanged phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} existing_members={} reason=skip_gameflow_override",
                        payload.data.phase,
                        payload.event_type,
                        event_game_id,
                        state.lifecycle_game_id,
                        state.cached_team_members.len()
                    );
                }
            }
            LcuWsEvent::ChampSelectSession(payload) => {
                let event_game_id = extract_champ_select_game_id(&payload.data);
                state.sync_lifecycle_game_id(event_game_id, "champ_select_session");
                let merged_session =
                    state.merge_teambuilder_into_champ_select_session(payload.data.clone());
                state.cached_champ_select_session = Some(merged_session.clone());
                let can_apply = payload.event_type != EventType::Delete
                    && state.current_phase() != OngoingGamePhase::InGame
                    && state.can_apply_member_snapshot(event_game_id);
                if can_apply {
                    let next_members = state.extract_champ_select_members(&merged_session);
                    tracing::info!(
                        "[ongoing_game] team snapshot source=champ_select phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} members={}",
                        GameflowPhase::ChampSelect,
                        payload.event_type,
                        event_game_id,
                        state.lifecycle_game_id,
                        next_members.len()
                    );
                    state.cached_team_members = next_members;
                } else {
                    tracing::info!(
                        "[ongoing_game] team snapshot source=unchanged phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} existing_members={} reason=skip_champ_select_override",
                        state.current_phase(),
                        payload.event_type,
                        event_game_id,
                        state.lifecycle_game_id,
                        state.cached_team_members.len()
                    );
                }
            }
            LcuWsEvent::TeambuilderTbdGame(payload) => {
                let event_game_id = extract_teambuilder_game_id(&payload.data.payload);
                state.sync_lifecycle_game_id(event_game_id, "teambuilder_tbd_game");
                state.cached_teambuilder_payload = Some(payload.data.payload.clone());
                if is_locked_teambuilder_subphase(&payload.data.payload) {
                    state.cached_locked_teambuilder_payload = Some(payload.data.payload.clone());
                }
                if payload.event_type == EventType::Delete
                    || state.current_phase() == OngoingGamePhase::InGame
                    || !state.can_apply_member_snapshot(event_game_id)
                {
                    tracing::info!(
                        "[ongoing_game] team snapshot source=unchanged phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} existing_members={} reason=skip_teambuilder_override",
                        state.current_phase(),
                        payload.event_type,
                        event_game_id,
                        state.lifecycle_game_id,
                        state.cached_team_members.len()
                    );
                } else if let Some(current_session) = state.cached_champ_select_session.clone() {
                    let merged_session =
                        state.merge_teambuilder_into_champ_select_session(current_session);
                    let next_members = state.extract_champ_select_members(&merged_session);
                    state.cached_champ_select_session = Some(merged_session);
                    tracing::info!(
                        "[ongoing_game] team snapshot source=teambuilder phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} members={}",
                        GameflowPhase::ChampSelect,
                        payload.event_type,
                        event_game_id,
                        state.lifecycle_game_id,
                        next_members.len()
                    );
                    state.cached_team_members = next_members;
                } else {
                    tracing::info!(
                        "[ongoing_game] team snapshot source=teambuilder phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} existing_members={} reason=await_champ_select_session",
                        state.current_phase(),
                        payload.event_type,
                        event_game_id,
                        state.lifecycle_game_id,
                        state.cached_team_members.len()
                    );
                }
            }
            _ => {}
        }

        let transitioned = if let Some(ref mut driver) = state.driver {
            driver.process(&event)
        } else {
            None
        };

        if let Some((prev_phase, next_phase)) = transitioned {
            tracing::info!(
                "[ongoing_game] phase transition {:?} -> {:?} lifecycle_game_id={:?}",
                prev_phase,
                next_phase,
                state.lifecycle_game_id
            );
            if next_phase == OngoingGamePhase::Idle {
                state.clear_caches_with_reason("phase_idle_transition");
            }
            let updated = state.build_updated_payload(&self.ctx.settings);
            drop(state);
            self.ctx.broadcast(OngoingGameEvent::Updated(updated));
        }
    }

    pub async fn handle_focus_changed(&self, lcu_session: Option<Arc<LcuSession>>) {
        let expected_focus = lcu_focus_key(lcu_session.as_ref());
        let updated = {
            let mut state = self.ctx.state.lock().await;
            state.lcu_session = lcu_session.clone();
            state.driver = Some(OngoingGameDriver::new(self.ctx.clone()));
            state.clear_caches_with_reason("focus_changed");
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
    }

    pub async fn set_match_history_mode(&self, mode: MatchHistoryModeSetting) {
        let updated = {
            let mut state = self.ctx.state.lock().await;
            if state.match_history_mode == mode {
                return;
            }
            state.match_history_mode = mode;
            state.build_updated_payload(&self.ctx.settings)
        };

        self.ctx.broadcast(OngoingGameEvent::Updated(updated));
    }

    pub async fn refresh_match_histories(&self) {
        let count = self.ctx.settings.match_history_count_value();

        let (
            puuids,
            lcu,
            lifecycle_game_id,
            effective_queue_id,
            tag,
            should_start,
            started_updated,
            gen,
        ) = {
            let mut state = self.ctx.state.lock().await;
            if state.match_histories_pending {
                let updated = state.build_updated_payload(&self.ctx.settings);
                (
                    Vec::new(),
                    None,
                    state.lifecycle_game_id,
                    state.effective_queue_id(),
                    state.effective_mode_tag(&self.ctx.settings),
                    false,
                    Some(updated),
                    state.generation,
                )
            } else {
                let gen = state.generation;
                let puuids = state
                    .team_players()
                    .into_iter()
                    .map(|(puuid, _)| puuid)
                    .collect::<Vec<_>>();
                state.cached_match_histories.clear();
                state.history_status_by_puuid.clear();
                state.mark_histories_loading(&puuids);
                let lcu = state.lcu_session.clone();
                let lifecycle_game_id = state.lifecycle_game_id;
                let effective_queue_id = state.effective_queue_id();
                let tag = state.effective_mode_tag(&self.ctx.settings);
                let updated = state.build_updated_payload(&self.ctx.settings);
                (
                    puuids,
                    lcu,
                    lifecycle_game_id,
                    effective_queue_id,
                    tag,
                    true,
                    Some(updated),
                    gen,
                )
            }
        };

        if let Some(updated) = started_updated {
            self.ctx.broadcast(OngoingGameEvent::Updated(updated));
        }

        if !should_start {
            return;
        }

        let ctx = self.ctx.clone();
        tokio::spawn(async move {
            tracing::info!(
                "[ongoing_game] refresh_match_histories start generation={} lifecycle_game_id={:?} effective_queue_id={:?} effective_mode_tag={:?} count={} puuids={}",
                gen,
                lifecycle_game_id,
                effective_queue_id,
                tag,
                count,
                puuids.len()
            );

            let sgp = match lcu {
                Some(ref lcu_session) => match lcu_session.to_sgp(&ctx.sgp_shard).await {
                    Ok(sgp) => Some(sgp),
                    Err(error) => {
                        tracing::warn!(
                            "[ongoing_game] refresh_match_histories: failed to create sgp session for pid={} error={}",
                            lcu_session.auth().pid,
                            error
                        );
                        None
                    }
                },
                None => None,
            };

            let semaphore = Arc::new(Semaphore::new(MAX_MATCH_HISTORY_FETCH_CONCURRENCY));
            let mut join_set = JoinSet::new();
            for puuid in puuids {
                let sgp = sgp.clone();
                let tag = tag.clone();
                let semaphore = semaphore.clone();
                join_set.spawn(async move {
                    let permit = match semaphore.acquire_owned().await {
                        Ok(permit) => permit,
                        Err(_) => return Some((puuid, OngoingGamePlayerLoadStatus::Failed, None)),
                    };
                    let _permit = permit;

                    let Some(ref sgp) = sgp else {
                        tracing::warn!(
                            "[ongoing_game] refresh_match_histories fetch skipped puuid={} generation={} reason=no_sgp_session",
                            puuid,
                            gen
                        );
                        return Some((puuid, OngoingGamePlayerLoadStatus::Failed, None));
                    };

                    match sgp
                        .api()
                        .get_match_summaries(&puuid, 0, count, tag.as_deref(), None)
                        .await
                    {
                        Ok(resp) => Some((puuid, OngoingGamePlayerLoadStatus::Ready, Some(resp.games))),
                        Err(error) => {
                            tracing::warn!(
                                "[ongoing_game] refresh_match_histories fetch failed puuid={} generation={} tag={:?} count={} error={}",
                                puuid,
                                gen,
                                tag,
                                count,
                                error
                            );
                            Some((puuid, OngoingGamePlayerLoadStatus::Failed, None))
                        }
                    }
                });
            }

            while let Some(joined) = join_set.join_next().await {
                let Ok(Some((puuid, status, games))) = joined else {
                    continue;
                };

                let mut state = ctx.state.lock().await;
                if state.generation != gen {
                    break;
                }
                state.set_history_status(&puuid, status, games);
                let phase = state
                    .driver
                    .as_ref()
                    .map(|d| d.current_phase())
                    .unwrap_or(OngoingGamePhase::Idle);
                let history_state = state.history_state_for_puuid(&puuid);
                drop(state);

                ctx.broadcast(OngoingGameEvent::MatchHistoriesUpdated(
                    crate::shards::ongoing_game::types::OngoingGameMatchHistoriesUpdated {
                        phase,
                        state: history_state,
                    },
                ));
            }

            let updated = {
                let mut state = ctx.state.lock().await;
                if state.generation == gen {
                    state.update_match_histories_pending();
                }
                state.build_updated_payload(&ctx.settings)
            };
            ctx.broadcast(OngoingGameEvent::Updated(updated));
        });
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
    pub(crate) sgp_shard: Arc<SgpShard>,
    pub(crate) state: Mutex<ManagerState>,
    pub(crate) event_tx: broadcast::Sender<OngoingGameEvent>,
}

impl OngoingGameContext {
    fn new(settings: OngoingGameManagerSettings, sgp_shard: Arc<SgpShard>) -> Self {
        let (event_tx, _) = broadcast::channel(64);
        Self {
            settings,
            sgp_shard,
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
    pub(crate) match_history_mode: MatchHistoryModeSetting,
    pub(crate) lifecycle_game_id: Option<u64>,
    pub(crate) cached_gameflow_session: Option<GameflowSessionData>,
    pub(crate) cached_champ_select_session: Option<ChampSelectSessionData>,
    pub(crate) cached_teambuilder_payload: Option<TeambuilderTbdGamePayload>,
    pub(crate) cached_locked_teambuilder_payload: Option<TeambuilderTbdGamePayload>,
    pub(crate) cached_summoners_by_puuid: HashMap<String, SummonerInfo>,
    pub(crate) summoner_status_by_puuid: HashMap<String, OngoingGamePlayerLoadStatus>,
    pub(crate) cached_match_histories: HashMap<String, Vec<RawMatchSummaryGame>>,
    pub(crate) history_status_by_puuid: HashMap<String, OngoingGamePlayerLoadStatus>,
    pub(crate) cached_team_members: Vec<ChampSelectTeamMember>,
    pub(crate) match_histories_pending: bool,
    pub(crate) generation: u64,
}

impl ManagerState {
    fn new() -> Self {
        Self {
            driver: None,
            lcu_session: None,
            match_history_mode: MatchHistoryModeSetting::CurrentMode,
            lifecycle_game_id: None,
            cached_gameflow_session: None,
            cached_champ_select_session: None,
            cached_teambuilder_payload: None,
            cached_locked_teambuilder_payload: None,
            cached_summoners_by_puuid: HashMap::new(),
            summoner_status_by_puuid: HashMap::new(),
            cached_match_histories: HashMap::new(),
            history_status_by_puuid: HashMap::new(),
            cached_team_members: Vec::new(),
            match_histories_pending: false,
            generation: 0,
        }
    }

    pub(crate) fn clear_caches_with_reason(&mut self, reason: &str) {
        if let Some(game_id) = self.lifecycle_game_id {
            tracing::info!(
                "[ongoing_game] lifecycle game_id ended game_id={} reason={}",
                game_id,
                reason
            );
        }
        self.lifecycle_game_id = None;
        self.cached_gameflow_session = None;
        self.cached_champ_select_session = None;
        self.cached_teambuilder_payload = None;
        self.cached_locked_teambuilder_payload = None;
        self.cached_summoners_by_puuid.clear();
        self.summoner_status_by_puuid.clear();
        self.cached_match_histories.clear();
        self.history_status_by_puuid.clear();
        self.cached_team_members.clear();
        self.match_histories_pending = false;
        self.generation = self.generation.wrapping_add(1);
    }

    pub(crate) fn sync_lifecycle_game_id(&mut self, event_game_id: Option<u64>, source: &str) {
        let Some(event_game_id) = event_game_id.filter(|game_id| *game_id > 0) else {
            return;
        };

        match self.lifecycle_game_id {
            None => {
                self.lifecycle_game_id = Some(event_game_id);
                tracing::info!(
                    "[ongoing_game] lifecycle game_id initialized source={} game_id={}",
                    source,
                    event_game_id
                );
            }
            Some(current) if current == event_game_id => {}
            Some(current) => {
                tracing::info!(
                    "[ongoing_game] lifecycle game_id changed source={} from={} to={} action=clear_caches",
                    source,
                    current,
                    event_game_id
                );
                self.clear_caches_with_reason("game_id_changed");
                self.lifecycle_game_id = Some(event_game_id);
            }
        }
    }

    pub(crate) fn can_apply_member_snapshot(&self, event_game_id: Option<u64>) -> bool {
        let Some(event_game_id) = event_game_id.filter(|game_id| *game_id > 0) else {
            return false;
        };

        match self.lifecycle_game_id {
            Some(current) => current == event_game_id,
            None => true,
        }
    }

    pub(crate) fn build_updated_payload(
        &self,
        _settings: &OngoingGameManagerSettings,
    ) -> OngoingGameUpdated {
        let phase = self.current_phase();
        let effective_queue_id = self.effective_queue_id();
        let effective_mode_tag = self.match_history_mode.effective_tag(effective_queue_id);

        OngoingGameUpdated {
            phase,
            lifecycle_game_id: self.lifecycle_game_id,
            match_history_tag: self.match_history_mode.payload_value(),
            effective_queue_id,
            effective_mode_tag,
            match_histories_pending: self.match_histories_pending,
            summoner_states: self.summoner_states(),
            history_states: self.history_states(),
            gameflow_session: self.cached_gameflow_session.clone(),
            champ_select_session: self.cached_champ_select_session.clone(),
            team_members: self.cached_team_members.clone(),
        }
    }

    pub(crate) fn current_phase(&self) -> OngoingGamePhase {
        self.driver
            .as_ref()
            .map(|d| d.current_phase())
            .unwrap_or(OngoingGamePhase::Idle)
    }

    fn champ_select_queue_id(&self) -> Option<u64> {
        self.cached_champ_select_session
            .as_ref()
            .map(|session| session.queue_id)
            .filter(|queue_id| *queue_id > 0)
    }

    fn gameflow_queue_id(&self) -> Option<u64> {
        self.cached_gameflow_session
            .as_ref()
            .map(|session| session.game_data.queue.id)
            .filter(|queue_id| *queue_id > 0)
    }

    pub(crate) fn effective_queue_id(&self) -> Option<u64> {
        let champ_select_queue_id = self.champ_select_queue_id();
        let gameflow_queue_id = self.gameflow_queue_id();

        match self.current_phase() {
            OngoingGamePhase::ChampSelect => champ_select_queue_id.or(gameflow_queue_id),
            OngoingGamePhase::InGame => gameflow_queue_id.or(champ_select_queue_id),
            OngoingGamePhase::Idle => None,
        }
    }

    pub(crate) fn effective_mode_tag(
        &self,
        _settings: &OngoingGameManagerSettings,
    ) -> Option<String> {
        self.match_history_mode
            .effective_tag(self.effective_queue_id())
    }

    pub(crate) fn team_players(&self) -> Vec<(String, u64)> {
        let mut seen = HashSet::new();
        let mut players = Vec::new();

        for member in &self.cached_team_members {
            if is_bot_puuid(&member.puuid) || !seen.insert(member.puuid.clone()) {
                continue;
            }
            players.push((member.puuid.clone(), member.team));
        }

        players
    }

    pub(crate) fn new_puuids(&self) -> Vec<String> {
        self.team_players()
            .into_iter()
            .map(|(puuid, _)| puuid)
            .filter(|p| !self.summoner_status_by_puuid.contains_key(p))
            .collect()
    }

    pub(crate) fn new_history_puuids(&self) -> Vec<String> {
        self.team_players()
            .into_iter()
            .map(|(puuid, _)| puuid)
            .filter(|p| !self.history_status_by_puuid.contains_key(p))
            .collect()
    }

    pub(crate) fn mark_summoners_loading(&mut self, puuids: &[String]) {
        for puuid in puuids {
            self.summoner_status_by_puuid
                .insert(puuid.clone(), OngoingGamePlayerLoadStatus::Loading);
        }
    }

    pub(crate) fn mark_histories_loading(&mut self, puuids: &[String]) {
        for puuid in puuids {
            self.history_status_by_puuid
                .insert(puuid.clone(), OngoingGamePlayerLoadStatus::Loading);
        }
        self.update_match_histories_pending();
    }

    pub(crate) fn set_history_status(
        &mut self,
        puuid: &str,
        status: OngoingGamePlayerLoadStatus,
        games: Option<Vec<RawMatchSummaryGame>>,
    ) {
        self.history_status_by_puuid.insert(puuid.to_owned(), status);
        match games {
            Some(games) => {
                self.cached_match_histories.insert(puuid.to_owned(), games);
            }
            None => {
                self.cached_match_histories.remove(puuid);
            }
        }
        self.update_match_histories_pending();
    }

    pub(crate) fn set_summoner_status(
        &mut self,
        puuid: &str,
        status: OngoingGamePlayerLoadStatus,
        summoner: Option<SummonerInfo>,
    ) {
        self.summoner_status_by_puuid.insert(puuid.to_owned(), status);
        match summoner {
            Some(summoner) => {
                self.cached_summoners_by_puuid.insert(puuid.to_owned(), summoner);
            }
            None => {
                self.cached_summoners_by_puuid.remove(puuid);
            }
        }
    }

    pub(crate) fn summoner_state_for_puuid(&self, puuid: &str) -> OngoingGameSummonerState {
        OngoingGameSummonerState {
            game_id: self.lifecycle_game_id,
            puuid: puuid.to_owned(),
            team_id: self.team_id_for_puuid(puuid),
            status: self
                .summoner_status_by_puuid
                .get(puuid)
                .copied()
                .unwrap_or(OngoingGamePlayerLoadStatus::Idle),
            summoner: self.cached_summoners_by_puuid.get(puuid).cloned(),
        }
    }

    pub(crate) fn history_state_for_puuid(&self, puuid: &str) -> OngoingGameMatchHistoryState {
        OngoingGameMatchHistoryState {
            game_id: self.lifecycle_game_id,
            puuid: puuid.to_owned(),
            team_id: self.team_id_for_puuid(puuid),
            status: self
                .history_status_by_puuid
                .get(puuid)
                .copied()
                .unwrap_or(OngoingGamePlayerLoadStatus::Idle),
            games: self.cached_match_histories.get(puuid).cloned(),
        }
    }

    pub(crate) fn team_id_for_puuid(&self, puuid: &str) -> u64 {
        self.cached_team_members
            .iter()
            .find(|member| member.puuid == puuid)
            .map(|member| member.team)
            .unwrap_or_default()
    }

    fn update_match_histories_pending(&mut self) {
        self.match_histories_pending = self
            .history_status_by_puuid
            .values()
            .any(|status| *status == OngoingGamePlayerLoadStatus::Loading);
    }

    fn summoner_states(&self) -> Vec<OngoingGameSummonerState> {
        self.team_players()
            .into_iter()
            .map(|(puuid, team_id)| OngoingGameSummonerState {
                game_id: self.lifecycle_game_id,
                puuid: puuid.clone(),
                team_id,
                status: self
                    .summoner_status_by_puuid
                    .get(&puuid)
                    .copied()
                    .unwrap_or(OngoingGamePlayerLoadStatus::Idle),
                summoner: self.cached_summoners_by_puuid.get(&puuid).cloned(),
            })
            .collect()
    }

    fn history_states(&self) -> Vec<OngoingGameMatchHistoryState> {
        self.team_players()
            .into_iter()
            .map(|(puuid, team_id)| OngoingGameMatchHistoryState {
                game_id: self.lifecycle_game_id,
                puuid: puuid.clone(),
                team_id,
                status: self
                    .history_status_by_puuid
                    .get(&puuid)
                    .copied()
                    .unwrap_or(OngoingGamePlayerLoadStatus::Idle),
                games: self.cached_match_histories.get(&puuid).cloned(),
            })
            .collect()
    }

    pub(crate) fn extract_champ_select_members(
        &self,
        session: &ChampSelectSessionData,
    ) -> Vec<ChampSelectTeamMember> {
        let gameflow_identities = self.gameflow_identities_by_summoner_id();
        session
            .my_team
            .iter()
            .cloned()
            .map(|member| self.normalize_champ_select_member(member, &gameflow_identities))
            .collect()
    }

    fn merge_teambuilder_into_champ_select_session(
        &self,
        mut session: ChampSelectSessionData,
    ) -> ChampSelectSessionData {
        let Some(payload) = self.cached_teambuilder_payload.as_ref() else {
            return session;
        };

        if !same_game_id(session.game_id, payload.game_id) {
            return session;
        }

        let identities =
            teambuilder_identities_by_cell_id(&payload.champion_select_state.cells.allied_team);

        if identities.is_empty() {
            return session;
        }

        for member in &mut session.my_team {
            let Some(identity) = identities.get(&member.cell_id) else {
                continue;
            };

            if member.puuid.trim().is_empty() && !identity.puuid.trim().is_empty() {
                member.puuid = identity.puuid.clone();
            }

            if member.summoner_id <= 0 && identity.summoner_id > 0 {
                member.summoner_id = identity.summoner_id;
            }
        }

        session
    }

    fn normalize_champ_select_member(
        &self,
        mut member: ChampSelectTeamMember,
        gameflow_identities: &HashMap<i64, GameflowIdentity>,
    ) -> ChampSelectTeamMember {
        let teambuilder_identity = self
            .cached_teambuilder_payload
            .as_ref()
            .and_then(|payload| {
                payload
                    .champion_select_state
                    .cells
                    .allied_team
                    .iter()
                    .find(|cell| cell.cell_id == member.cell_id)
            });

        if let Some(identity) = teambuilder_identity {
            if identity.summoner_id == 0 {
                return mark_member_as_bot(member);
            }
        }

        if let Some(identity) = gameflow_identities.get(&member.summoner_id) {
            if !has_resolved_puuid(&member.puuid) && has_resolved_puuid(&identity.puuid) {
                member.puuid = identity.puuid.clone();
            }

            if member.game_name.trim().is_empty() && !identity.game_name.trim().is_empty() {
                member.game_name = identity.game_name.clone();
            }

            if member.internal_name.trim().is_empty() && !identity.internal_name.trim().is_empty() {
                member.internal_name = identity.internal_name.clone();
            }
        }

        finalize_member_identity(member)
    }

    fn gameflow_identities_by_summoner_id(&self) -> HashMap<i64, GameflowIdentity> {
        let Some(session) = self.cached_gameflow_session.as_ref() else {
            return HashMap::new();
        };

        session
            .game_data
            .team_one
            .iter()
            .chain(session.game_data.team_two.iter())
            .filter_map(|member| {
                let summoner_id = member.summoner_id as i64;
                (summoner_id > 0).then(|| {
                    (
                        summoner_id,
                        GameflowIdentity {
                            puuid: member.puuid.clone(),
                            game_name: member.summoner_name.clone(),
                            internal_name: member.summoner_internal_name.clone(),
                        },
                    )
                })
            })
            .collect()
    }

    pub(crate) fn extract_gameflow_members(
        session: &GameflowSessionData,
    ) -> Vec<ChampSelectTeamMember> {
        let mut members = Vec::new();
        for (team, mapped_team_id) in [
            (&session.game_data.team_one, 100_u64),
            (&session.game_data.team_two, 200_u64),
        ] {
            for t in team {
                members.push(ChampSelectTeamMember {
                    puuid: t.puuid.clone(),
                    champion_id: t.champion_id,
                    summoner_id: t.summoner_id as i64,
                    team: mapped_team_id,
                    assigned_position: t.selected_position,
                    game_name: t.summoner_name.clone(),
                    internal_name: t.summoner_internal_name.clone(),
                    ..Default::default()
                });
            }
        }
        members.into_iter().map(finalize_member_identity).collect()
    }

    fn should_merge_locked_teambuilder_roster(&self, gameflow: &GameflowSessionData) -> bool {
        let Some(payload) = self.cached_locked_teambuilder_payload.as_ref() else {
            return false;
        };

        if !same_game_id(gameflow.game_data.game_id, payload.game_id) {
            return false;
        }

        if is_practice_tool_gameflow(gameflow) {
            return true;
        }

        let locked_member_count = extract_teambuilder_allied_members(payload).len()
            + self.extract_teambuilder_enemy_slots_for_ingame(payload).len();
        let gameflow_member_count = Self::extract_gameflow_members(gameflow).len();
        locked_member_count > gameflow_member_count
    }

    fn merge_gameflow_with_locked_teambuilder_members(
        &self,
        gameflow: &GameflowSessionData,
    ) -> Vec<ChampSelectTeamMember> {
        let Some(payload) = self.cached_locked_teambuilder_payload.as_ref() else {
            return Self::extract_gameflow_members(gameflow);
        };

        let locked_allied_members = extract_teambuilder_allied_members(payload);
        let locked_enemy_slots = self.extract_teambuilder_enemy_slots_for_ingame(payload);
        let gameflow_members = Self::extract_gameflow_members(gameflow);
        let (gameflow_allied_members, gameflow_enemy_members): (Vec<_>, Vec<_>) = gameflow_members
            .into_iter()
            .partition(|member| member.team == 100);

        let mut merged = merge_locked_roster_with_gameflow_members(
            locked_allied_members,
            gameflow_allied_members,
        );
        merged.extend(merge_locked_enemy_slots_with_gameflow_members(
            locked_enemy_slots,
            gameflow_enemy_members,
        ));
        merged
    }

    fn extract_teambuilder_enemy_slots_for_ingame(
        &self,
        locked_payload: &TeambuilderTbdGamePayload,
    ) -> Vec<ChampSelectTeamMember> {
        let latest_enemy_cells = self
            .cached_teambuilder_payload
            .as_ref()
            .filter(|payload| same_game_id(payload.game_id, locked_payload.game_id))
            .map(|payload| payload.champion_select_state.cells.enemy_team.clone())
            .unwrap_or_default();

        extract_teambuilder_enemy_slots(locked_payload)
            .into_iter()
            .map(|slot| {
                let Some(latest_cell) = latest_enemy_cells
                    .iter()
                    .find(|cell| cell.cell_id == slot.cell_id)
                else {
                    return slot;
                };

                let mut enriched = slot;
                if enriched.champion_id == 0 {
                    enriched.champion_id = latest_cell.champion_id;
                }
                if enriched.champion_pick_intent == 0 {
                    enriched.champion_pick_intent = latest_cell.champion_pick_intent;
                }
                if enriched.spell1_id == 0 {
                    enriched.spell1_id = latest_cell.spell1_id;
                }
                if enriched.spell2_id == 0 {
                    enriched.spell2_id = latest_cell.spell2_id;
                }
                enriched
            })
            .collect()
    }
}

fn lcu_focus_key(session: Option<&Arc<LcuSession>>) -> Option<(u32, u16)> {
    session.map(|entry| (entry.auth().pid, entry.auth().port))
}

fn has_gameflow_team_data(session: &GameflowSessionData) -> bool {
    !session.game_data.team_one.is_empty() || !session.game_data.team_two.is_empty()
}

fn extract_gameflow_game_id(session: &GameflowSessionData) -> Option<u64> {
    (session.game_data.game_id > 0).then_some(session.game_data.game_id)
}

fn extract_champ_select_game_id(session: &ChampSelectSessionData) -> Option<u64> {
    (session.game_id > 0).then_some(session.game_id)
}

fn extract_teambuilder_game_id(payload: &TeambuilderTbdGamePayload) -> Option<u64> {
    (payload.game_id > 0).then_some(payload.game_id)
}

fn teambuilder_identities_by_cell_id(
    cells: &[TeambuilderCell],
) -> HashMap<u64, TeambuilderCellIdentity> {
    cells
        .iter()
        .filter_map(|cell| {
            let has_identity = !cell.puuid.trim().is_empty() || cell.summoner_id > 0;
            has_identity.then(|| {
                (
                    cell.cell_id,
                    TeambuilderCellIdentity {
                        puuid: cell.puuid.clone(),
                        summoner_id: cell.summoner_id,
                    },
                )
            })
        })
        .collect()
}

fn same_game_id(left: u64, right: u64) -> bool {
    left > 0 && right > 0 && left == right
}

fn is_locked_teambuilder_subphase(payload: &TeambuilderTbdGamePayload) -> bool {
    payload
        .champion_select_state
        .subphase
        .eq_ignore_ascii_case("GAME_STARTING")
}

fn is_practice_tool_gameflow(session: &GameflowSessionData) -> bool {
    session.map.game_mode.eq_ignore_ascii_case("PRACTICETOOL")
        || session
            .game_data
            .queue
            .game_mode
            .eq_ignore_ascii_case("PRACTICETOOL")
        || session.game_data.queue.id == 3140
}

fn extract_teambuilder_allied_members(
    payload: &TeambuilderTbdGamePayload,
) -> Vec<ChampSelectTeamMember> {
    payload
        .champion_select_state
        .cells
        .allied_team
        .iter()
        .map(|cell| {
            let member = teambuilder_cell_to_member(cell);
            if cell.summoner_id == 0 {
                mark_member_as_bot(member)
            } else {
                finalize_member_identity(member)
            }
        })
        .collect()
}

fn extract_teambuilder_enemy_slots(
    payload: &TeambuilderTbdGamePayload,
) -> Vec<ChampSelectTeamMember> {
    payload
        .champion_select_state
        .cells
        .enemy_team
        .iter()
        .map(teambuilder_cell_to_member)
        .collect()
}

fn teambuilder_cell_to_member(cell: &TeambuilderCell) -> ChampSelectTeamMember {
    ChampSelectTeamMember {
        cell_id: cell.cell_id,
        puuid: cell.puuid.clone(),
        champion_id: cell.champion_id,
        champion_pick_intent: cell.champion_pick_intent,
        game_name: cell.game_name.clone(),
        tag_line: cell.tag_line.clone(),
        spell1_id: cell.spell1_id,
        spell2_id: cell.spell2_id,
        name_visibility_type: cell.name_visibility_type.clone(),
        summoner_id: cell.summoner_id,
        assigned_position: lane_position_from_teambuilder(&cell.assigned_position),
        team: normalize_teambuilder_team_id(cell.team_id),
        ..Default::default()
    }
}

fn merge_locked_roster_with_gameflow_members(
    locked_members: Vec<ChampSelectTeamMember>,
    gameflow_members: Vec<ChampSelectTeamMember>,
) -> Vec<ChampSelectTeamMember> {
    let mut remaining_gameflow = gameflow_members;
    let mut merged = Vec::with_capacity(locked_members.len() + remaining_gameflow.len());

    for locked_member in locked_members {
        let matched_index = remaining_gameflow
            .iter()
            .position(|gameflow_member| matches_member_identity(gameflow_member, &locked_member));

        if let Some(index) = matched_index {
            let gameflow_member = remaining_gameflow.remove(index);
            merged.push(overlay_member_from_gameflow(locked_member, gameflow_member));
        } else {
            merged.push(locked_member);
        }
    }

    merged.extend(remaining_gameflow);
    merged
}

fn merge_locked_enemy_slots_with_gameflow_members(
    enemy_slots: Vec<ChampSelectTeamMember>,
    gameflow_enemy_members: Vec<ChampSelectTeamMember>,
) -> Vec<ChampSelectTeamMember> {
    let mut remaining_gameflow = gameflow_enemy_members;
    let mut merged = Vec::with_capacity(enemy_slots.len() + remaining_gameflow.len());

    for enemy_slot in enemy_slots {
        if let Some(index) = find_matching_enemy_gameflow_index(&enemy_slot, &remaining_gameflow) {
            let gameflow_member = remaining_gameflow.remove(index);
            merged.push(overlay_member_from_gameflow(enemy_slot, gameflow_member));
        } else {
            merged.push(mark_member_as_bot(enemy_slot));
        }
    }

    merged.extend(remaining_gameflow.into_iter().map(finalize_member_identity));
    merged
}

fn find_matching_enemy_gameflow_index(
    enemy_slot: &ChampSelectTeamMember,
    gameflow_enemy_members: &[ChampSelectTeamMember],
) -> Option<usize> {
    if enemy_slot.champion_id > 0 {
        let mut matches = gameflow_enemy_members
            .iter()
            .enumerate()
            .filter(|(_, member)| member.champion_id == enemy_slot.champion_id)
            .map(|(index, _)| index);

        if let Some(first_match) = matches.next() {
            if matches.next().is_none() {
                return Some(first_match);
            }
        }
    }

    gameflow_enemy_members.first().map(|_| 0)
}

fn matches_member_identity(
    gameflow_member: &ChampSelectTeamMember,
    locked_member: &ChampSelectTeamMember,
) -> bool {
    (gameflow_member.summoner_id > 0
        && locked_member.summoner_id > 0
        && gameflow_member.summoner_id == locked_member.summoner_id)
        || (has_resolved_puuid(&gameflow_member.puuid)
            && has_resolved_puuid(&locked_member.puuid)
            && gameflow_member.puuid == locked_member.puuid)
}

fn overlay_member_from_gameflow(
    mut base_member: ChampSelectTeamMember,
    gameflow_member: ChampSelectTeamMember,
) -> ChampSelectTeamMember {
    base_member.puuid = gameflow_member.puuid;
    base_member.champion_id = gameflow_member.champion_id;
    base_member.summoner_id = gameflow_member.summoner_id;
    base_member.team = gameflow_member.team;
    base_member.assigned_position = gameflow_member.assigned_position;

    if base_member.game_name.trim().is_empty() {
        base_member.game_name = gameflow_member.game_name;
    }
    if base_member.internal_name.trim().is_empty() {
        base_member.internal_name = gameflow_member.internal_name;
    }

    finalize_member_identity(base_member)
}

fn normalize_teambuilder_team_id(team_id: u64) -> u64 {
    match team_id {
        1 => 100,
        2 => 200,
        other => other,
    }
}

fn lane_position_from_teambuilder(raw: &str) -> crate::shards::lcu::events::LanePosition {
    match raw.trim().to_ascii_lowercase().as_str() {
        "middle" | "mid" => crate::shards::lcu::events::LanePosition::Middle,
        "top" => crate::shards::lcu::events::LanePosition::Top,
        "bottom" | "bot" | "adc" => crate::shards::lcu::events::LanePosition::Bottom,
        "jungle" | "jg" => crate::shards::lcu::events::LanePosition::Jungle,
        "utility" | "support" | "sup" => crate::shards::lcu::events::LanePosition::Utility,
        "fill" => crate::shards::lcu::events::LanePosition::Fill,
        "afk" => crate::shards::lcu::events::LanePosition::AFK,
        _ => crate::shards::lcu::events::LanePosition::None,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TeambuilderCellIdentity {
    puuid: String,
    summoner_id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct GameflowIdentity {
    puuid: String,
    game_name: String,
    internal_name: String,
}

fn has_resolved_puuid(raw: &str) -> bool {
    !raw.trim().is_empty() && !raw.trim().eq_ignore_ascii_case(BOT_PUUID)
}

fn finalize_member_identity(member: ChampSelectTeamMember) -> ChampSelectTeamMember {
    if has_resolved_puuid(&member.puuid) {
        member
    } else {
        mark_member_as_bot(member)
    }
}

fn mark_member_as_bot(mut member: ChampSelectTeamMember) -> ChampSelectTeamMember {
    member.game_name.clear();
    member.tag_line.clear();
    member.internal_name.clear();
    member.name_visibility_type = "VISIBLE".to_string();
    member.summoner_id = 0;
    member.puuid = BOT_PUUID.to_string();
    member
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

fn should_apply_gameflow_members(phase: GameflowPhase) -> bool {
    matches!(
        phase,
        GameflowPhase::GameStart | GameflowPhase::InProgress | GameflowPhase::InGame
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

#[cfg(test)]
mod tests {
    use super::ManagerState;
    use crate::shards::lcu::events::champ_select_session::{ChampSelectSessionData, TeamMember};
    use crate::shards::lcu::events::gameflow_phase::Phase;
    use crate::shards::lcu::events::gameflow_session::{
        GameData, GameflowSessionData, Queue, Team,
    };
    use crate::shards::lcu::events::teambuilder_tbd_game::{
        TeambuilderCell, TeambuilderCells, TeambuilderChampionSelectState,
        TeambuilderTbdGamePayload,
    };

    fn single_member_champ_select_session(
        game_id: u64,
        cell_id: u64,
        puuid: &str,
        summoner_id: i64,
    ) -> ChampSelectSessionData {
        ChampSelectSessionData {
            game_id,
            my_team: vec![TeamMember {
                cell_id,
                puuid: puuid.to_string(),
                summoner_id,
                ..Default::default()
            }],
            ..Default::default()
        }
    }

    fn single_member_teambuilder_payload(
        game_id: u64,
        cell_id: u64,
        puuid: &str,
        summoner_id: i64,
    ) -> TeambuilderTbdGamePayload {
        TeambuilderTbdGamePayload {
            game_id,
            champion_select_state: TeambuilderChampionSelectState {
                cells: TeambuilderCells {
                    allied_team: vec![TeambuilderCell {
                        cell_id,
                        puuid: puuid.to_string(),
                        summoner_id,
                        ..Default::default()
                    }],
                    enemy_team: Vec::new(),
                },
                ..Default::default()
            },
            ..Default::default()
        }
    }

    #[test]
    fn merges_hidden_member_identity_from_teambuilder_payload() {
        let mut state = ManagerState::new();
        state.cached_teambuilder_payload = Some(single_member_teambuilder_payload(
            42,
            5,
            "ally-puuid",
            12345,
        ));

        let merged = state.merge_teambuilder_into_champ_select_session(
            single_member_champ_select_session(42, 5, "", 0),
        );

        assert_eq!(merged.my_team[0].puuid, "ally-puuid");
        assert_eq!(merged.my_team[0].summoner_id, 12345);
    }

    #[test]
    fn preserves_existing_identity_when_champ_select_already_has_values() {
        let mut state = ManagerState::new();
        state.cached_teambuilder_payload = Some(single_member_teambuilder_payload(
            42,
            5,
            "teambuilder-puuid",
            12345,
        ));

        let merged = state.merge_teambuilder_into_champ_select_session(
            single_member_champ_select_session(42, 5, "existing-puuid", 99999),
        );

        assert_eq!(merged.my_team[0].puuid, "existing-puuid");
        assert_eq!(merged.my_team[0].summoner_id, 99999);
    }

    #[test]
    fn ignores_teambuilder_payload_for_different_game_id() {
        let mut state = ManagerState::new();
        state.cached_teambuilder_payload = Some(single_member_teambuilder_payload(
            100,
            5,
            "ally-puuid",
            12345,
        ));

        let merged = state.merge_teambuilder_into_champ_select_session(
            single_member_champ_select_session(42, 5, "", 0),
        );

        assert!(merged.my_team[0].puuid.is_empty());
        assert_eq!(merged.my_team[0].summoner_id, 0);
    }

    #[test]
    fn normalizes_unresolved_member_to_bot() {
        let state = ManagerState::new();

        let members =
            state.extract_champ_select_members(&single_member_champ_select_session(0, 5, "", 0));

        assert_eq!(members[0].puuid, "BOT");
    }

    #[test]
    fn marks_teambuilder_member_with_zero_summoner_id_as_bot() {
        let mut state = ManagerState::new();
        state.cached_teambuilder_payload = Some(single_member_teambuilder_payload(
            42,
            5,
            "fake-bot-puuid",
            0,
        ));

        let mut session = single_member_champ_select_session(42, 5, "fake-bot-puuid", 0);
        session.my_team[0].champion_id = 236;
        let members = state.extract_champ_select_members(&session);

        assert_eq!(members[0].puuid, "BOT");
        assert_eq!(members[0].summoner_id, 0);
    }

    #[test]
    fn fills_champ_select_puuid_from_gameflow_identity() {
        let mut state = ManagerState::new();
        state.cached_gameflow_session = Some(GameflowSessionData {
            phase: Phase::ChampSelect,
            game_data: GameData {
                team_one: vec![Team {
                    puuid: "resolved-puuid".to_string(),
                    summoner_id: 12345,
                    summoner_name: "Resolved".to_string(),
                    summoner_internal_name: "ResolvedInternal".to_string(),
                    ..Default::default()
                }],
                queue: Queue {
                    id: 420,
                    ..Default::default()
                },
                ..Default::default()
            },
            ..Default::default()
        });

        let members = state
            .extract_champ_select_members(&single_member_champ_select_session(0, 5, "", 12345));

        assert_eq!(members[0].puuid, "resolved-puuid");
        assert_eq!(members[0].game_name, "Resolved");
        assert_eq!(members[0].internal_name, "ResolvedInternal");
    }

    #[test]
    fn practice_tool_gameflow_keeps_locked_teambuilder_bot_slots() {
        let mut state = ManagerState::new();
        state.cached_locked_teambuilder_payload = Some(TeambuilderTbdGamePayload {
            game_id: 42,
            queue_id: 3140,
            champion_select_state: TeambuilderChampionSelectState {
                subphase: "GAME_STARTING".to_string(),
                cells: TeambuilderCells {
                    allied_team: vec![TeambuilderCell {
                        team_id: 1,
                        cell_id: 1,
                        puuid: "resolved-puuid".to_string(),
                        summoner_id: 12345,
                        game_name: "Resolved".to_string(),
                        champion_id: 110,
                        ..Default::default()
                    }],
                    enemy_team: vec![TeambuilderCell {
                        team_id: 2,
                        cell_id: 2,
                        puuid: "fake-bot-puuid".to_string(),
                        summoner_id: 0,
                        champion_id: 236,
                        ..Default::default()
                    }],
                },
                ..Default::default()
            },
            ..Default::default()
        });

        let merged = state.merge_gameflow_with_locked_teambuilder_members(&GameflowSessionData {
            phase: Phase::InProgress,
            map: crate::shards::lcu::events::gameflow_session::Map {
                game_mode: "PRACTICETOOL".to_string(),
                ..Default::default()
            },
            game_data: GameData {
                game_id: 42,
                queue: Queue {
                    id: 3140,
                    game_mode: "PRACTICETOOL".to_string(),
                    ..Default::default()
                },
                team_one: vec![Team {
                    puuid: "resolved-puuid".to_string(),
                    summoner_id: 12345,
                    summoner_name: "Resolved".to_string(),
                    champion_id: 110,
                    ..Default::default()
                }],
                ..Default::default()
            },
            ..Default::default()
        });

        assert_eq!(merged.len(), 2);
        assert!(merged.iter().any(|member| member.puuid == "resolved-puuid"));
        assert!(merged
            .iter()
            .any(|member| member.puuid == "BOT" && member.team == 200));
    }

    #[test]
    fn practice_tool_enemy_slots_use_gameflow_human_difference() {
        let mut state = ManagerState::new();
        state.cached_locked_teambuilder_payload = Some(TeambuilderTbdGamePayload {
            game_id: 42,
            queue_id: 3140,
            champion_select_state: TeambuilderChampionSelectState {
                subphase: "GAME_STARTING".to_string(),
                cells: TeambuilderCells {
                    allied_team: vec![TeambuilderCell {
                        team_id: 1,
                        cell_id: 1,
                        puuid: "ally-puuid".to_string(),
                        summoner_id: 12345,
                        game_name: "Ally".to_string(),
                        champion_id: 110,
                        ..Default::default()
                    }],
                    enemy_team: vec![
                        TeambuilderCell {
                            team_id: 2,
                            cell_id: 2,
                            champion_id: 236,
                            name_visibility_type: "HIDDEN".to_string(),
                            ..Default::default()
                        },
                        TeambuilderCell {
                            team_id: 2,
                            cell_id: 3,
                            champion_id: 147,
                            name_visibility_type: "HIDDEN".to_string(),
                            ..Default::default()
                        },
                    ],
                },
                ..Default::default()
            },
            ..Default::default()
        });

        let merged = state.merge_gameflow_with_locked_teambuilder_members(&GameflowSessionData {
            phase: Phase::InProgress,
            map: crate::shards::lcu::events::gameflow_session::Map {
                game_mode: "PRACTICETOOL".to_string(),
                ..Default::default()
            },
            game_data: GameData {
                game_id: 42,
                queue: Queue {
                    id: 3140,
                    game_mode: "PRACTICETOOL".to_string(),
                    ..Default::default()
                },
                team_one: vec![Team {
                    puuid: "ally-puuid".to_string(),
                    summoner_id: 12345,
                    summoner_name: "Ally".to_string(),
                    champion_id: 110,
                    ..Default::default()
                }],
                team_two: vec![Team {
                    puuid: "enemy-human-puuid".to_string(),
                    summoner_id: 54321,
                    summoner_name: "Enemy".to_string(),
                    champion_id: 236,
                    ..Default::default()
                }],
                ..Default::default()
            },
            ..Default::default()
        });

        assert_eq!(merged.len(), 3);
        assert!(merged
            .iter()
            .any(|member| member.puuid == "enemy-human-puuid" && member.team == 200));
        assert!(merged.iter().any(|member| {
            member.puuid == "BOT"
                && member.team == 200
                && member.champion_id == 147
                && member.name_visibility_type == "VISIBLE"
        }));
    }

    #[test]
    fn practice_tool_enemy_bot_keeps_champion_from_latest_teambuilder_snapshot() {
        let mut state = ManagerState::new();
        state.cached_locked_teambuilder_payload = Some(TeambuilderTbdGamePayload {
            game_id: 42,
            queue_id: 3140,
            champion_select_state: TeambuilderChampionSelectState {
                subphase: "GAME_STARTING".to_string(),
                cells: TeambuilderCells {
                    allied_team: vec![TeambuilderCell {
                        team_id: 1,
                        cell_id: 1,
                        puuid: "ally-puuid".to_string(),
                        summoner_id: 12345,
                        champion_id: 110,
                        ..Default::default()
                    }],
                    enemy_team: vec![TeambuilderCell {
                        team_id: 2,
                        cell_id: 2,
                        champion_id: 0,
                        champion_pick_intent: 0,
                        name_visibility_type: "HIDDEN".to_string(),
                        ..Default::default()
                    }],
                },
                ..Default::default()
            },
            ..Default::default()
        });
        state.cached_teambuilder_payload = Some(TeambuilderTbdGamePayload {
            game_id: 42,
            queue_id: 3140,
            champion_select_state: TeambuilderChampionSelectState {
                subphase: "FINALIZATION".to_string(),
                cells: TeambuilderCells {
                    allied_team: vec![TeambuilderCell {
                        team_id: 1,
                        cell_id: 1,
                        puuid: "ally-puuid".to_string(),
                        summoner_id: 12345,
                        champion_id: 110,
                        ..Default::default()
                    }],
                    enemy_team: vec![TeambuilderCell {
                        team_id: 2,
                        cell_id: 2,
                        champion_id: 147,
                        champion_pick_intent: 147,
                        spell1_id: 4,
                        spell2_id: 7,
                        name_visibility_type: "HIDDEN".to_string(),
                        ..Default::default()
                    }],
                },
                ..Default::default()
            },
            ..Default::default()
        });

        let merged = state.merge_gameflow_with_locked_teambuilder_members(&GameflowSessionData {
            phase: Phase::InProgress,
            map: crate::shards::lcu::events::gameflow_session::Map {
                game_mode: "PRACTICETOOL".to_string(),
                ..Default::default()
            },
            game_data: GameData {
                game_id: 42,
                queue: Queue {
                    id: 3140,
                    game_mode: "PRACTICETOOL".to_string(),
                    ..Default::default()
                },
                team_one: vec![Team {
                    puuid: "ally-puuid".to_string(),
                    summoner_id: 12345,
                    champion_id: 110,
                    ..Default::default()
                }],
                ..Default::default()
            },
            ..Default::default()
        });

        assert!(merged.iter().any(|member| {
            member.puuid == "BOT"
                && member.team == 200
                && member.champion_id == 147
                && member.champion_pick_intent == 147
        }));
    }

    #[test]
    fn same_puuid_is_not_re_requested_within_same_lifecycle() {
        let mut state = ManagerState::new();
        state.cached_team_members = vec![TeamMember {
            puuid: "ally-puuid".to_string(),
            summoner_id: 12345,
            ..Default::default()
        }];

        assert_eq!(state.new_history_puuids(), vec!["ally-puuid".to_string()]);

        state.mark_histories_loading(&["ally-puuid".to_string()]);

        assert!(state.new_history_puuids().is_empty());
    }

    #[test]
    fn lifecycle_reset_allows_history_request_again() {
        let mut state = ManagerState::new();
        state.cached_team_members = vec![TeamMember {
            puuid: "ally-puuid".to_string(),
            summoner_id: 12345,
            ..Default::default()
        }];
        state.mark_histories_loading(&["ally-puuid".to_string()]);

        state.clear_caches_with_reason("test_reset");
        state.cached_team_members = vec![TeamMember {
            puuid: "ally-puuid".to_string(),
            summoner_id: 12345,
            ..Default::default()
        }];

        assert_eq!(state.new_history_puuids(), vec!["ally-puuid".to_string()]);
    }
}
