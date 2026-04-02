use std::collections::HashMap;
use std::sync::Arc;

use serde_json::Value;
use tokio::sync::{broadcast, Mutex};
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
use crate::shards::ongoing_game::types::{OngoingGameEvent, OngoingGamePhase, OngoingGameUpdated};
use crate::shards::settings::SettingHandle;
use crate::shards::sgp::matches::RawMatchSummaryGame;
use crate::shards::sgp::LcuSessionSgpExt;
use crate::shards::sgp::SgpShard;

use super::driver::OngoingGameDriver;

pub(crate) const DEFAULT_MATCH_HISTORY_COUNT: u32 = 50;
const QUEUE_MODE_ALL_VALUE: &str = "__all__";
const QUEUE_MODE_CURRENT_VALUE: &str = "__current_mode__";

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum MatchHistoryModeSetting {
    All,
    CurrentMode,
    FixedTag(String),
}

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

    pub fn match_history_mode_value(&self) -> MatchHistoryModeSetting {
        self.match_history_tag
            .get_value()
            .ok()
            .as_ref()
            .map(parse_queue_mode_setting)
            .unwrap_or(MatchHistoryModeSetting::All)
    }

    pub fn match_history_tag_for_payload_value(&self) -> Option<String> {
        match self.match_history_mode_value() {
            MatchHistoryModeSetting::All => None,
            MatchHistoryModeSetting::CurrentMode => Some(QUEUE_MODE_CURRENT_VALUE.to_string()),
            MatchHistoryModeSetting::FixedTag(tag) => Some(tag),
        }
    }

    pub fn match_history_effective_tag(&self, effective_queue_id: Option<u64>) -> Option<String> {
        match self.match_history_mode_value() {
            MatchHistoryModeSetting::All => None,
            MatchHistoryModeSetting::CurrentMode => {
                effective_queue_id.map(|queue_id| format!("q_{queue_id}"))
            }
            MatchHistoryModeSetting::FixedTag(tag) => Some(tag),
        }
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
                    let next_members = ManagerState::extract_gameflow_members(&payload.data);
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
                    let next_members = ManagerState::extract_champ_select_members(&merged_session);
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
                    let next_members = ManagerState::extract_champ_select_members(&merged_session);
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
                state.match_histories_pending = true;
                state.cached_match_histories.clear();
                let gen = state.generation;
                let puuids = state.team_puuids();
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

            let mut join_set = JoinSet::new();
            for puuid in puuids {
                let sgp = sgp.clone();
                let tag = tag.clone();
                join_set.spawn(async move {
                    let Some(ref sgp) = sgp else {
                        tracing::warn!(
                            "[ongoing_game] refresh_match_histories fetch skipped puuid={} generation={} reason=no_sgp_session",
                            puuid,
                            gen
                        );
                        return Some((puuid, Vec::new()));
                    };

                    match sgp
                        .api()
                        .get_match_summaries(&puuid, 0, count, tag.as_deref(), None)
                        .await
                    {
                        Ok(resp) => Some((puuid, resp.games)),
                        Err(error) => {
                            tracing::warn!(
                                "[ongoing_game] refresh_match_histories fetch failed puuid={} generation={} tag={:?} count={} error={}",
                                puuid,
                                gen,
                                tag,
                                count,
                                error
                            );
                            Some((puuid, Vec::new()))
                        }
                    }
                });
            }

            while let Some(joined) = join_set.join_next().await {
                let Ok(Some((puuid, games))) = joined else {
                    continue;
                };

                let mut state = ctx.state.lock().await;
                if state.generation != gen {
                    break;
                }
                state.cached_match_histories.insert(puuid, games);
                let phase = state
                    .driver
                    .as_ref()
                    .map(|d| d.current_phase())
                    .unwrap_or(OngoingGamePhase::Idle);
                let all_histories = state.cached_match_histories.clone();
                drop(state);

                ctx.broadcast(OngoingGameEvent::MatchHistoriesUpdated(
                    crate::shards::ongoing_game::types::OngoingGameMatchHistoriesUpdated {
                        phase,
                        match_histories: all_histories,
                    },
                ));
            }

            let updated = {
                let mut state = ctx.state.lock().await;
                if state.generation == gen {
                    state.match_histories_pending = false;
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
    pub(crate) lifecycle_game_id: Option<u64>,
    pub(crate) cached_gameflow_session: Option<GameflowSessionData>,
    pub(crate) cached_champ_select_session: Option<ChampSelectSessionData>,
    pub(crate) cached_teambuilder_payload: Option<TeambuilderTbdGamePayload>,
    pub(crate) cached_summoners_by_puuid: HashMap<String, SummonerInfo>,
    pub(crate) cached_match_histories: HashMap<String, Vec<RawMatchSummaryGame>>,
    pub(crate) cached_team_members: Vec<ChampSelectTeamMember>,
    pub(crate) match_histories_pending: bool,
    pub(crate) generation: u64,
}

impl ManagerState {
    fn new() -> Self {
        Self {
            driver: None,
            lcu_session: None,
            lifecycle_game_id: None,
            cached_gameflow_session: None,
            cached_champ_select_session: None,
            cached_teambuilder_payload: None,
            cached_summoners_by_puuid: HashMap::new(),
            cached_match_histories: HashMap::new(),
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
        self.cached_summoners_by_puuid.clear();
        self.cached_match_histories.clear();
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
        settings: &OngoingGameManagerSettings,
    ) -> OngoingGameUpdated {
        let phase = self.current_phase();
        let effective_queue_id = self.effective_queue_id();
        let effective_mode_tag = settings.match_history_effective_tag(effective_queue_id);

        OngoingGameUpdated {
            phase,
            match_history_tag: settings.match_history_tag_for_payload_value(),
            effective_queue_id,
            effective_mode_tag,
            match_histories_pending: self.match_histories_pending,
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
        settings: &OngoingGameManagerSettings,
    ) -> Option<String> {
        settings.match_history_effective_tag(self.effective_queue_id())
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
        session.my_team.clone()
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

        let identities = teambuilder_identities_by_cell_id(
            &payload.champion_select_state.cells.allied_team,
        );

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
        members
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
    cells.iter()
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

#[derive(Debug, Clone, PartialEq, Eq)]
struct TeambuilderCellIdentity {
    puuid: String,
    summoner_id: i64,
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

#[cfg(test)]
mod tests {
    use super::ManagerState;
    use crate::shards::lcu::events::champ_select_session::{ChampSelectSessionData, TeamMember};
    use crate::shards::lcu::events::teambuilder_tbd_game::{
        TeambuilderCell, TeambuilderCells, TeambuilderChampionSelectState, TeambuilderTbdGamePayload,
    };

    #[test]
    fn merges_hidden_member_identity_from_teambuilder_payload() {
        let mut state = ManagerState::new();
        state.cached_teambuilder_payload = Some(TeambuilderTbdGamePayload {
            game_id: 42,
            champion_select_state: TeambuilderChampionSelectState {
                cells: TeambuilderCells {
                    allied_team: vec![TeambuilderCell {
                        cell_id: 5,
                        puuid: "ally-puuid".to_string(),
                        summoner_id: 12345,
                        ..Default::default()
                    }],
                    enemy_team: Vec::new(),
                },
                ..Default::default()
            },
            ..Default::default()
        });

        let merged = state.merge_teambuilder_into_champ_select_session(ChampSelectSessionData {
            game_id: 42,
            my_team: vec![TeamMember {
                cell_id: 5,
                puuid: String::new(),
                summoner_id: 0,
                ..Default::default()
            }],
            ..Default::default()
        });

        assert_eq!(merged.my_team[0].puuid, "ally-puuid");
        assert_eq!(merged.my_team[0].summoner_id, 12345);
    }

    #[test]
    fn preserves_existing_identity_when_champ_select_already_has_values() {
        let mut state = ManagerState::new();
        state.cached_teambuilder_payload = Some(TeambuilderTbdGamePayload {
            game_id: 42,
            champion_select_state: TeambuilderChampionSelectState {
                cells: TeambuilderCells {
                    allied_team: vec![TeambuilderCell {
                        cell_id: 5,
                        puuid: "teambuilder-puuid".to_string(),
                        summoner_id: 12345,
                        ..Default::default()
                    }],
                    enemy_team: Vec::new(),
                },
                ..Default::default()
            },
            ..Default::default()
        });

        let merged = state.merge_teambuilder_into_champ_select_session(ChampSelectSessionData {
            game_id: 42,
            my_team: vec![TeamMember {
                cell_id: 5,
                puuid: "existing-puuid".to_string(),
                summoner_id: 99999,
                ..Default::default()
            }],
            ..Default::default()
        });

        assert_eq!(merged.my_team[0].puuid, "existing-puuid");
        assert_eq!(merged.my_team[0].summoner_id, 99999);
    }

    #[test]
    fn ignores_teambuilder_payload_for_different_game_id() {
        let mut state = ManagerState::new();
        state.cached_teambuilder_payload = Some(TeambuilderTbdGamePayload {
            game_id: 100,
            champion_select_state: TeambuilderChampionSelectState {
                cells: TeambuilderCells {
                    allied_team: vec![TeambuilderCell {
                        cell_id: 5,
                        puuid: "ally-puuid".to_string(),
                        summoner_id: 12345,
                        ..Default::default()
                    }],
                    enemy_team: Vec::new(),
                },
                ..Default::default()
            },
            ..Default::default()
        });

        let merged = state.merge_teambuilder_into_champ_select_session(ChampSelectSessionData {
            game_id: 42,
            my_team: vec![TeamMember {
                cell_id: 5,
                puuid: String::new(),
                summoner_id: 0,
                ..Default::default()
            }],
            ..Default::default()
        });

        assert!(merged.my_team[0].puuid.is_empty());
        assert_eq!(merged.my_team[0].summoner_id, 0);
    }
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

fn parse_queue_mode_setting(value: &Value) -> MatchHistoryModeSetting {
    let Some(raw) = value.as_str().map(str::trim) else {
        return MatchHistoryModeSetting::All;
    };

    if raw.is_empty() || raw == QUEUE_MODE_ALL_VALUE || raw.eq_ignore_ascii_case("all") {
        return MatchHistoryModeSetting::All;
    }

    if raw == QUEUE_MODE_CURRENT_VALUE {
        return MatchHistoryModeSetting::CurrentMode;
    }

    MatchHistoryModeSetting::FixedTag(raw.to_string())
}
