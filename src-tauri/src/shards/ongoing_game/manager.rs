use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use serde_json::Value;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;

use super::context::{OngoingGameContext, MAX_MATCH_HISTORY_FETCH_CONCURRENCY};

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::concepts::champ_select_session::{
    ChampSelectSession, ChampSelectSessionData, TeamMember as ChampSelectTeamMember,
};
use crate::shards::lcu::concepts::gameflow_phase::Phase as GameflowPhase;
use crate::shards::lcu::concepts::gameflow_session::{GameflowSession, GameflowSessionData};
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::lcu::concepts::teambuilder_tbd_game::{
    TeambuilderCell, TeambuilderTbdGame, TeambuilderTbdGameMessage, TeambuilderTbdGamePayload,
};
use crate::shards::lcu::concepts::{
    EventType, LanePosition, LcuWsEvent, URI_GAMEFLOW_SESSION, URI_RMS_TEAMBUILDER_TBD_GAME,
    URI_TEAM_BUILDER_CHAMP_SELECT_SESSION,
};
use crate::shards::lcu::manager::LcuManagerStateEvent;
use crate::shards::lcu::LcuShard;
use crate::shards::ongoing_game::types::{
    OngoingGameEvent, OngoingGameMatchHistoriesUpdated, OngoingGameMatchHistoryState,
    OngoingGamePhase, OngoingGamePlayerLoadStatus, OngoingGameSummonerState,
    OngoingGameSummonersUpdated, OngoingGameUpdated,
};
use crate::shards::settings::SettingHandle;
use crate::shards::sgp::matches::RawMatchSummaryGame;
use crate::shards::sgp::LcuSessionSgpExt;
use crate::shards::sgp::SgpShard;

use super::driver::OngoingGameDriver;

pub(crate) const DEFAULT_MATCH_HISTORY_COUNT: u32 = 50;
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
pub struct OngoingGameSettings {
    pub match_history_count: SettingHandle,
}

impl OngoingGameSettings {
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
    pub(crate) fn new(
        settings: OngoingGameSettings,
        sgp_shard: Arc<SgpShard>,
        lcu_shard: Arc<LcuShard>,
    ) -> Self {
        Self {
            ctx: Arc::new(OngoingGameContext::new(settings, sgp_shard, lcu_shard)),
        }
    }

    pub async fn handle_ws_event(&self, event: LcuWsEvent) {
        let mut state = self.ctx.state.lock().await;
        let mut members_changed = false;

        match &event {
            LcuWsEvent::GameflowSession(payload) => {
                let event_game_id = extract_gameflow_game_id(&payload.data);
                state.sync_lifecycle_game_id(event_game_id, "gameflow_session");
                state.cached_gameflow_session = Some(payload.data.clone());
                if should_apply_gameflow_members(payload.data.phase)
                    && payload.event_type != EventType::Delete
                    && state.can_apply_member_snapshot(event_game_id)
                {
                    let next_members =
                        if state.should_merge_locked_teambuilder_roster(&payload.data) {
                            state.merge_gameflow_with_locked_teambuilder_members(&payload.data)
                        } else if state.cached_team_members.is_empty() {
                            ManagerState::extract_gameflow_members(&payload.data)
                        } else {
                            state.merge_cached_with_gameflow_members(&payload.data)
                        };
                    tracing::info!(
                        "[ongoing_game] team snapshot source=gameflow phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} members={}",
                        payload.data.phase,
                        payload.event_type,
                        event_game_id,
                        state.lifecycle_game_id,
                        next_members.len()
                    );
                    members_changed =
                        !team_members_equivalent(&state.cached_team_members, &next_members);
                    state.cached_team_members = next_members;
                } else {
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
                state.cached_champ_select_session = Some(payload.data.clone());
                tracing::info!(
                    "[ongoing_game] champ_select metadata updated event_type={:?} event_game_id={:?} lifecycle_game_id={:?} my_team={} their_team={}",
                    payload.event_type,
                    event_game_id,
                    state.lifecycle_game_id,
                    payload.data.my_team.len(),
                    payload.data.their_team.len()
                );

                // During cold start in ChampSelect we seed with
                // `/lol-lobby-team-builder/champ-select/v1/session`. Treat this
                // payload as the roster source.
                if payload.event_type != EventType::Delete {
                    if payload.uri == URI_TEAM_BUILDER_CHAMP_SELECT_SESSION {
                        let next_members = extract_team_builder_champ_select_members(&payload.data);
                        tracing::info!(
                            "[ongoing_game] team snapshot source=team_builder_champ_select_session phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} members={}",
                            GameflowPhase::ChampSelect,
                            payload.event_type,
                            event_game_id,
                            state.lifecycle_game_id,
                            next_members.len()
                        );
                        members_changed =
                            !team_members_equivalent(&state.cached_team_members, &next_members);
                        state.cached_team_members = next_members;
                    }

                    // Hover intent: LCU only exposes unlocked hover picks through
                    // `actions[]` (`type == "pick"`, `!completed`).
                    let mut hover_by_cell: HashMap<u64, u64> = HashMap::new();
                    for action_group in &payload.data.actions {
                        for action in action_group {
                            if action.r#type == "pick"
                                && !action.completed
                                && action.champion_id > 0
                            {
                                hover_by_cell.insert(action.actor_cell_id, action.champion_id);
                            }
                        }
                    }
                    if !hover_by_cell.is_empty() {
                        for member in state.cached_team_members.iter_mut() {
                            if member.champion_id > 0 {
                                continue;
                            }
                            if let Some(&hovered) = hover_by_cell.get(&member.cell_id) {
                                if member.champion_pick_intent != hovered {
                                    member.champion_pick_intent = hovered;
                                    members_changed = true;
                                }
                            }
                        }
                    }
                }
            }
            // Teambuilder RMS payload is still cached for in-game merge logic, but
            // cold-start ChampSelect roster now comes from
            // `/lol-lobby-team-builder/champ-select/v1/session`.
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
                } else {
                    if !state.cached_team_members.is_empty() {
                        // Champ-select session already populated the roster
                        // (positions, champion ids, cell layout), but in
                        // hidden-name ranked pre-reveal those entries lack the
                        // real puuid / summoner id. Overlay the TBD allies
                        // by cell_id to fill in the missing identity fields.
                        let allies = &payload.data.payload.champion_select_state.cells.allied_team;
                        let by_cell: HashMap<u64, &TeambuilderCell> =
                            allies.iter().map(|c| (c.cell_id, c)).collect();

                        let mut overlay_changed = false;
                        for member in state.cached_team_members.iter_mut() {
                            let Some(cell) = by_cell.get(&member.cell_id) else {
                                continue;
                            };
                            if !cell.puuid.trim().is_empty() && member.puuid != cell.puuid {
                                member.puuid = cell.puuid.clone();
                                overlay_changed = true;
                            }
                            if cell.summoner_id > 0 && member.summoner_id != cell.summoner_id {
                                member.summoner_id = cell.summoner_id;
                                overlay_changed = true;
                            }
                            if !cell.game_name.trim().is_empty()
                                && member.game_name != cell.game_name
                            {
                                member.game_name = cell.game_name.clone();
                                overlay_changed = true;
                            }
                            if !cell.tag_line.trim().is_empty() && member.tag_line != cell.tag_line
                            {
                                member.tag_line = cell.tag_line.clone();
                                overlay_changed = true;
                            }
                        }
                        members_changed = overlay_changed;
                        tracing::info!(
                            "[ongoing_game] team snapshot source=teambuilder_overlay phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} members={} changed={}",
                            state.current_phase(),
                            payload.event_type,
                            event_game_id,
                            state.lifecycle_game_id,
                            state.cached_team_members.len(),
                            overlay_changed,
                        );
                    } else {
                        let next_members =
                            extract_teambuilder_allied_members(&payload.data.payload);
                        if next_members.is_empty() && !state.cached_team_members.is_empty() {
                            tracing::info!(
                                "[ongoing_game] team snapshot source=unchanged phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} existing_members={} reason=skip_empty_teambuilder_replace",
                                state.current_phase(),
                                payload.event_type,
                                event_game_id,
                                state.lifecycle_game_id,
                                state.cached_team_members.len()
                            );
                        } else {
                            tracing::info!(
                                "[ongoing_game] team snapshot source=teambuilder phase={:?} event_type={:?} event_game_id={:?} lifecycle_game_id={:?} members={}",
                                GameflowPhase::ChampSelect,
                                payload.event_type,
                                event_game_id,
                                state.lifecycle_game_id,
                                next_members.len()
                            );
                            members_changed =
                                !team_members_equivalent(&state.cached_team_members, &next_members);
                            state.cached_team_members = next_members;
                        }
                    }
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
        } else if members_changed {
            let updated = state.build_updated_payload(&self.ctx.settings);
            drop(state);
            self.ctx.broadcast(OngoingGameEvent::Updated(updated));
        }
    }

    /// Subscribe to LCU focus changes via the LcuShard.  Must be called once
    /// after `LcuShard::initialize` so that `lcu_shard.manager()` is `Some`.
    pub fn start(self: &Arc<Self>) {
        let Some(lcu_manager) = self.ctx.lcu_shard.manager() else {
            tracing::error!(
                "[ongoing_game] start: LcuShard manager not initialized — focus subscription skipped"
            );
            return;
        };

        let manager = self.clone();
        lcu_manager.subscribe_state_fn(move |event| {
            let manager = manager.clone();
            async move {
                if let LcuManagerStateEvent::FocusChanged(change) = event {
                    manager.on_focus_changed(change.current).await;
                }
            }
        });
    }

    async fn on_focus_changed(self: &Arc<Self>, pid: Option<u32>) {
        // Dedup at the manager boundary so league_bridge doesn't have to.
        {
            let mut state = self.ctx.state.lock().await;
            if state.last_focus_pid == pid {
                return;
            }
            state.last_focus_pid = pid;
            state.driver = Some(OngoingGameDriver::new(self.ctx.clone()));
            state.clear_caches_with_reason("focus_changed");
        }

        if pid.is_none() {
            // Disconnected — broadcast Idle so the frontend clears the view.
            self.refresh_current().await;
            return;
        }

        // Connected — let seed_from_current_session handle the first
        // broadcast to avoid an intermediate Idle flash on the frontend.
        let manager = self.clone();
        tokio::spawn(async move {
            manager.seed_from_current_session(pid).await;
        });
    }

    pub async fn refresh_current(&self) {
        let state = self.ctx.state.lock().await;
        let updated = state.build_updated_payload(&self.ctx.settings);
        self.ctx.broadcast(OngoingGameEvent::Updated(updated));
        // Re-emit individual events so the frontend receives cached data
        // (the lightweight Updated payload no longer carries it).
        state.emit_cached_individual_events(&self.ctx);
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
                let lifecycle_game_id = state.lifecycle_game_id;
                let effective_queue_id = state.effective_queue_id();
                let tag = state.effective_mode_tag(&self.ctx.settings);
                let updated = state.build_updated_payload(&self.ctx.settings);
                (
                    puuids,
                    lifecycle_game_id,
                    effective_queue_id,
                    tag,
                    true,
                    Some(updated),
                    gen,
                )
            }
        };

        // Resolve session AFTER dropping the state lock to avoid nested
        // locking against `Lcu Manager`'s internal mutex.
        let lcu = if should_start {
            self.ctx.focused_session().await
        } else {
            None
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
                    OngoingGameMatchHistoriesUpdated {
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

    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<OngoingGameEvent> {
        self.ctx.channels.subscribe()
    }

    async fn seed_from_current_session(&self, expected_pid: Option<u32>) {
        let Some(lcu_session) = self.ctx.focused_session().await else {
            self.refresh_current().await;
            return;
        };

        let Ok(seed) = lcu_session.api().get_ongoing_session_seed().await else {
            // Seed fetch failed — broadcast current (Idle) state so the frontend
            // is not stuck on stale data.
            self.refresh_current().await;
            return;
        };

        let seed_events = seed_to_ws_events(&seed);
        if seed_events.is_empty() {
            // No active game — broadcast current (Idle) state.
            self.refresh_current().await;
            return;
        }

        for event in seed_events {
            if !self.current_focus_matches(expected_pid).await {
                return;
            }
            self.handle_ws_event(event).await;
        }

        if !self.current_focus_matches(expected_pid).await {
            return;
        }

        self.refresh_current().await;
    }

    async fn current_focus_matches(&self, expected_pid: Option<u32>) -> bool {
        self.ctx.focused_pid().await == expected_pid
    }
}

pub(crate) struct ManagerState {
    pub(crate) driver: Option<OngoingGameDriver>,
    pub(crate) last_focus_pid: Option<u32>,
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
    pub(crate) fn new() -> Self {
        Self {
            driver: None,
            last_focus_pid: None,
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
        _settings: &OngoingGameSettings,
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

    pub(crate) fn effective_mode_tag(&self, _settings: &OngoingGameSettings) -> Option<String> {
        self.match_history_mode
            .effective_tag(self.effective_queue_id())
    }

    pub(crate) fn team_players(&self) -> Vec<(String, u64)> {
        let mut seen = HashSet::new();
        let mut players = Vec::new();

        for member in &self.cached_team_members {
            if member.puuid.trim().is_empty()
                || member.summoner_id == 0
                || is_bot_puuid(&member.puuid)
                || !seen.insert(member.puuid.clone())
            {
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
        self.history_status_by_puuid
            .insert(puuid.to_owned(), status);
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
        self.summoner_status_by_puuid
            .insert(puuid.to_owned(), status);
        match summoner {
            Some(summoner) => {
                self.cached_summoners_by_puuid
                    .insert(puuid.to_owned(), summoner);
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

    /// Lightweight summoner states for Updated payloads — carries status only,
    /// no heavy summoner data (sent via individual SummonersUpdated events).
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
                summoner: None,
            })
            .collect()
    }

    /// Lightweight history states for Updated payloads — carries status only,
    /// no heavy games arrays (sent via individual MatchHistoriesUpdated events).
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
                games: None,
            })
            .collect()
    }

    /// Emit individual SummonersUpdated / MatchHistoriesUpdated for every
    /// player that already has cached data.  Used on refresh / bootstrap so
    /// the frontend receives the actual data through the incremental channel.
    pub(crate) fn emit_cached_individual_events(&self, ctx: &OngoingGameContext) {
        let phase = self.current_phase();
        for (puuid, _team_id) in self.team_players() {
            if let Some(status) = self.summoner_status_by_puuid.get(&puuid) {
                if *status == OngoingGamePlayerLoadStatus::Ready {
                    ctx.broadcast(OngoingGameEvent::SummonersUpdated(
                        OngoingGameSummonersUpdated {
                            phase,
                            state: self.summoner_state_for_puuid(&puuid),
                        },
                    ));
                }
            }
            if let Some(status) = self.history_status_by_puuid.get(&puuid) {
                if *status == OngoingGamePlayerLoadStatus::Ready {
                    ctx.broadcast(OngoingGameEvent::MatchHistoriesUpdated(
                        OngoingGameMatchHistoriesUpdated {
                            phase,
                            state: self.history_state_for_puuid(&puuid),
                        },
                    ));
                }
            }
        }
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

        is_practice_tool_gameflow(gameflow)
    }

    fn merge_gameflow_with_locked_teambuilder_members(
        &self,
        gameflow: &GameflowSessionData,
    ) -> Vec<ChampSelectTeamMember> {
        let Some(payload) = self.cached_locked_teambuilder_payload.as_ref() else {
            return Self::extract_gameflow_members(gameflow);
        };

        let gameflow_members = Self::extract_gameflow_members(gameflow);
        let locked_allied_members = extract_teambuilder_allied_members(payload);
        let allied_gameflow_team = gameflow_members
            .iter()
            .find_map(|gameflow_member| {
                locked_allied_members
                    .iter()
                    .any(|locked_member| matches_member_identity(gameflow_member, locked_member))
                    .then_some(gameflow_member.team)
            })
            .unwrap_or_else(|| {
                locked_allied_members
                    .first()
                    .and_then(|member| map_teambuilder_team_to_gameflow_team(member.team))
                    .unwrap_or(100)
            });
        let enemy_gameflow_team = if allied_gameflow_team == 100 {
            200
        } else {
            100
        };

        let locked_allied_members = locked_allied_members
            .into_iter()
            .map(|member| ChampSelectTeamMember {
                team: allied_gameflow_team,
                ..member
            })
            .collect();
        let locked_enemy_slots = self
            .extract_teambuilder_enemy_slots_for_ingame(payload)
            .into_iter()
            .map(|member| ChampSelectTeamMember {
                team: enemy_gameflow_team,
                ..member
            })
            .collect();
        let (gameflow_allied_members, gameflow_enemy_members): (Vec<_>, Vec<_>) = gameflow_members
            .into_iter()
            .partition(|member| member.team == allied_gameflow_team);

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

    /// Merge gameflow members into the existing `cached_team_members`, preserving
    /// the cached order within each team bucket. Gameflow data is overlaid onto
    /// matching cached members; any gameflow-only members are appended per-bucket.
    fn merge_cached_with_gameflow_members(
        &self,
        gameflow: &GameflowSessionData,
    ) -> Vec<ChampSelectTeamMember> {
        let gameflow_members = Self::extract_gameflow_members(gameflow);

        // Build a mapping from cached team id → gameflow team id (1→100, 2→200).
        // If the cached members already use gameflow-style ids (100/200), the map
        // is an identity.
        let team_id_map =
            build_cached_to_gameflow_team_map(&self.cached_team_members, &gameflow_members);

        // Partition gameflow members by team.
        let mut gameflow_by_team: HashMap<u64, Vec<ChampSelectTeamMember>> = HashMap::new();
        for member in gameflow_members {
            gameflow_by_team
                .entry(member.team)
                .or_default()
                .push(member);
        }

        let mut merged: Vec<ChampSelectTeamMember> =
            Vec::with_capacity(self.cached_team_members.len());

        // Walk cached members in their original order, overlay gameflow data.
        for cached_member in &self.cached_team_members {
            let gameflow_team = team_id_map
                .get(&cached_member.team)
                .copied()
                .unwrap_or(cached_member.team);
            let remaining = gameflow_by_team.get_mut(&gameflow_team);

            if let Some(remaining) = remaining {
                let matched_index = find_matching_locked_gameflow_index(cached_member, remaining);
                if let Some(index) = matched_index {
                    let gameflow_member = remaining.remove(index);
                    merged.push(overlay_member_from_gameflow(
                        cached_member.clone(),
                        gameflow_member,
                    ));
                    continue;
                }
            }
            // No gameflow match — keep cached member but remap its team id.
            let mut kept = cached_member.clone();
            kept.team = gameflow_team;
            merged.push(finalize_member_identity(kept));
        }

        // Append any gameflow members that had no cached counterpart.
        for (_, remaining) in gameflow_by_team {
            for member in remaining {
                merged.push(member);
            }
        }

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

fn extract_gameflow_game_id(session: &GameflowSessionData) -> Option<u64> {
    (session.game_data.game_id > 0).then_some(session.game_data.game_id)
}

fn extract_champ_select_game_id(session: &ChampSelectSessionData) -> Option<u64> {
    (session.game_id > 0).then_some(session.game_id)
}

fn extract_teambuilder_game_id(payload: &TeambuilderTbdGamePayload) -> Option<u64> {
    (payload.game_id > 0).then_some(payload.game_id)
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
        .map(teambuilder_cell_to_member)
        .collect()
}

fn extract_team_builder_champ_select_members(
    session: &ChampSelectSessionData,
) -> Vec<ChampSelectTeamMember> {
    let mut members = Vec::with_capacity(session.my_team.len() + session.their_team.len());
    members.extend(session.my_team.iter().cloned());
    members.extend(session.their_team.iter().cloned());
    members
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

fn team_members_equivalent(a: &[ChampSelectTeamMember], b: &[ChampSelectTeamMember]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b.iter()).all(|(l, r)| {
        l.cell_id == r.cell_id
            && l.puuid == r.puuid
            && l.summoner_id == r.summoner_id
            && l.team == r.team
            && l.champion_id == r.champion_id
            && l.champion_pick_intent == r.champion_pick_intent
            && l.spell1_id == r.spell1_id
            && l.spell2_id == r.spell2_id
            && l.assigned_position == r.assigned_position
            && l.name_visibility_type == r.name_visibility_type
    })
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
        name_visibility_type: cell.name_visibility_type.into(),
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
        let matched_index =
            find_matching_locked_gameflow_index(&locked_member, &remaining_gameflow);

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

fn find_unique_champion_match(
    champion_id: u64,
    members: &[ChampSelectTeamMember],
) -> Option<usize> {
    if champion_id == 0 {
        return None;
    }
    let mut matches = members
        .iter()
        .enumerate()
        .filter(|(_, m)| m.champion_id == champion_id)
        .map(|(i, _)| i);
    let first = matches.next()?;
    if matches.next().is_some() {
        return None;
    }
    Some(first)
}

fn find_matching_locked_gameflow_index(
    locked_member: &ChampSelectTeamMember,
    gameflow_members: &[ChampSelectTeamMember],
) -> Option<usize> {
    if let Some(index) = gameflow_members
        .iter()
        .position(|gameflow_member| matches_member_identity(gameflow_member, locked_member))
    {
        return Some(index);
    }

    find_unique_champion_match(locked_member.champion_id, gameflow_members)
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
            merged.push(enemy_slot);
        }
    }

    merged.extend(remaining_gameflow);
    merged
}

fn find_matching_enemy_gameflow_index(
    enemy_slot: &ChampSelectTeamMember,
    gameflow_enemy_members: &[ChampSelectTeamMember],
) -> Option<usize> {
    find_unique_champion_match(enemy_slot.champion_id, gameflow_enemy_members)
        .or_else(|| gameflow_enemy_members.first().map(|_| 0))
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

/// Build a mapping from cached team ids to gameflow team ids by finding members
/// that appear in both sets (matched by identity) and recording which team id
/// changed.  Falls back to the well-known 1→100, 2→200 mapping.
fn build_cached_to_gameflow_team_map(
    cached: &[ChampSelectTeamMember],
    gameflow: &[ChampSelectTeamMember],
) -> HashMap<u64, u64> {
    let mut map = HashMap::new();

    for cached_member in cached {
        if map.contains_key(&cached_member.team) {
            continue;
        }
        for gf_member in gameflow {
            if matches_member_identity(gf_member, cached_member) {
                map.insert(cached_member.team, gf_member.team);
                break;
            }
        }
    }

    // Fallback for any cached teams that had no identity match.
    for cached_member in cached {
        map.entry(cached_member.team).or_insert_with(|| {
            map_teambuilder_team_to_gameflow_team(cached_member.team).unwrap_or(cached_member.team)
        });
    }

    map
}

fn normalize_teambuilder_team_id(team_id: u64) -> u64 {
    team_id
}

fn map_teambuilder_team_to_gameflow_team(team_id: u64) -> Option<u64> {
    match team_id {
        1 => Some(100),
        2 => Some(200),
        _ => None,
    }
}

fn lane_position_from_teambuilder(raw: &str) -> LanePosition {
    match raw.trim().to_ascii_lowercase().as_str() {
        "middle" | "mid" => LanePosition::Middle,
        "top" => LanePosition::Top,
        "bottom" | "bot" | "adc" => LanePosition::Bottom,
        "jungle" | "jg" => LanePosition::Jungle,
        "utility" | "support" | "sup" => LanePosition::Utility,
        "fill" => LanePosition::Fill,
        "afk" => LanePosition::AFK,
        _ => LanePosition::None,
    }
}

fn has_resolved_puuid(raw: &str) -> bool {
    !raw.trim().is_empty() && !raw.trim().eq_ignore_ascii_case(BOT_PUUID)
}

fn finalize_member_identity(member: ChampSelectTeamMember) -> ChampSelectTeamMember {
    member
}

fn seed_to_ws_events(seed: &OngoingSessionSeed) -> Vec<LcuWsEvent> {
    let mut events = Vec::new();

    if let Some(ref champ_select) = seed.champ_select_session {
        events.push(LcuWsEvent::ChampSelectSession(ChampSelectSession {
            event_type: EventType::Update,
            uri: URI_TEAM_BUILDER_CHAMP_SELECT_SESSION.to_string(),
            data: champ_select.clone(),
        }));
    }

    // After ChampSelectSession (which provides cell layout / champion ids /
    // positions), replay the cached TBD payload so the manager can backfill
    // real puuid / summoner id for hidden-name allies.
    if let Some(ref payload) = seed.teambuilder_payload {
        events.push(LcuWsEvent::TeambuilderTbdGame(TeambuilderTbdGame {
            event_type: EventType::Update,
            uri: URI_RMS_TEAMBUILDER_TBD_GAME.to_string(),
            data: TeambuilderTbdGameMessage {
                payload: payload.clone(),
                resource: "teambuilder/v1/tbdGameDtoV1".to_string(),
                ..Default::default()
            },
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
    use super::{extract_teambuilder_allied_members, ManagerState};
    use crate::shards::lcu::concepts::champ_select_session::TeamMember;
    use crate::shards::lcu::concepts::gameflow_phase::Phase;
    use crate::shards::lcu::concepts::gameflow_session::{
        GameData, GameflowSessionData, Queue, Team,
    };
    use crate::shards::lcu::concepts::teambuilder_tbd_game::{
        NameVisibilityType, TeambuilderCell, TeambuilderCells, TeambuilderChampionSelectState,
        TeambuilderTbdGamePayload,
    };

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
    fn teambuilder_allied_members_only_include_allies() {
        let payload = TeambuilderTbdGamePayload {
            game_id: 42,
            champion_select_state: TeambuilderChampionSelectState {
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
                        cell_id: 6,
                        champion_id: 147,
                        name_visibility_type: NameVisibilityType::HIDDEN,
                        ..Default::default()
                    }],
                },
                ..Default::default()
            },
            ..Default::default()
        };

        let members = extract_teambuilder_allied_members(&payload);

        assert_eq!(members.len(), 1);
        assert_eq!(members[0].team, 1);
        assert_eq!(members[0].puuid, "ally-puuid");
        assert_eq!(members[0].champion_id, 110);
    }

    #[test]
    fn teambuilder_allied_members_keep_zero_summoner_identity() {
        let payload = single_member_teambuilder_payload(42, 5, "fake-bot-puuid", 0);

        let members = extract_teambuilder_allied_members(&payload);

        assert_eq!(members.len(), 1);
        assert_eq!(members[0].puuid, "fake-bot-puuid");
        assert_eq!(members[0].summoner_id, 0);
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
            map: crate::shards::lcu::concepts::gameflow_session::Map {
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
            .any(|member| member.puuid == "fake-bot-puuid" && member.team == 200));
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
                            name_visibility_type: NameVisibilityType::HIDDEN,
                            ..Default::default()
                        },
                        TeambuilderCell {
                            team_id: 2,
                            cell_id: 3,
                            champion_id: 147,
                            name_visibility_type: NameVisibilityType::HIDDEN,
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
            map: crate::shards::lcu::concepts::gameflow_session::Map {
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
            member.team == 200
                && member.summoner_id == 0
                && member.champion_id == 147
                && member.name_visibility_type
                    == crate::shards::lcu::concepts::champ_select_session::NameVisibilityType::HIDDEN
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
                        name_visibility_type: NameVisibilityType::HIDDEN,
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
                        name_visibility_type: NameVisibilityType::HIDDEN,
                        ..Default::default()
                    }],
                },
                ..Default::default()
            },
            ..Default::default()
        });

        let merged = state.merge_gameflow_with_locked_teambuilder_members(&GameflowSessionData {
            phase: Phase::InProgress,
            map: crate::shards::lcu::concepts::gameflow_session::Map {
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
            member.team == 200
                && member.summoner_id == 0
                && member.champion_id == 147
                && member.champion_pick_intent == 147
        }));
    }

    #[test]
    fn practice_tool_red_side_allied_team_stays_red_in_gameflow_merge() {
        let mut state = ManagerState::new();
        state.cached_locked_teambuilder_payload = Some(TeambuilderTbdGamePayload {
            game_id: 42,
            queue_id: 3140,
            champion_select_state: TeambuilderChampionSelectState {
                subphase: "GAME_STARTING".to_string(),
                cells: TeambuilderCells {
                    allied_team: vec![
                        TeambuilderCell {
                            team_id: 2,
                            cell_id: 4,
                            puuid: "local-red-puuid".to_string(),
                            summoner_id: 12345,
                            champion_id: 222,
                            ..Default::default()
                        },
                        TeambuilderCell {
                            team_id: 2,
                            cell_id: 5,
                            puuid: "bot-1".to_string(),
                            summoner_id: 0,
                            champion_id: 254,
                            ..Default::default()
                        },
                        TeambuilderCell {
                            team_id: 2,
                            cell_id: 6,
                            puuid: "bot-2".to_string(),
                            summoner_id: 0,
                            champion_id: 901,
                            ..Default::default()
                        },
                        TeambuilderCell {
                            team_id: 2,
                            cell_id: 7,
                            puuid: "bot-3".to_string(),
                            summoner_id: 0,
                            champion_id: 68,
                            ..Default::default()
                        },
                        TeambuilderCell {
                            team_id: 2,
                            cell_id: 8,
                            puuid: "bot-4".to_string(),
                            summoner_id: 0,
                            champion_id: 37,
                            ..Default::default()
                        },
                    ],
                    enemy_team: vec![
                        TeambuilderCell {
                            team_id: 1,
                            cell_id: 0,
                            champion_id: 81,
                            name_visibility_type: NameVisibilityType::HIDDEN,
                            ..Default::default()
                        },
                        TeambuilderCell {
                            team_id: 1,
                            cell_id: 1,
                            champion_id: 44,
                            name_visibility_type: NameVisibilityType::HIDDEN,
                            ..Default::default()
                        },
                        TeambuilderCell {
                            team_id: 1,
                            cell_id: 2,
                            champion_id: 6,
                            name_visibility_type: NameVisibilityType::HIDDEN,
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
            map: crate::shards::lcu::concepts::gameflow_session::Map {
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
                team_one: vec![
                    Team {
                        puuid: "enemy-bot-1".to_string(),
                        summoner_id: 0,
                        champion_id: 81,
                        ..Default::default()
                    },
                    Team {
                        puuid: "enemy-bot-2".to_string(),
                        summoner_id: 0,
                        champion_id: 44,
                        ..Default::default()
                    },
                    Team {
                        puuid: "enemy-bot-3".to_string(),
                        summoner_id: 0,
                        champion_id: 6,
                        ..Default::default()
                    },
                ],
                team_two: vec![
                    Team {
                        puuid: "local-red-puuid".to_string(),
                        summoner_id: 12345,
                        champion_id: 222,
                        ..Default::default()
                    },
                    Team {
                        puuid: "red-bot-1".to_string(),
                        summoner_id: 0,
                        champion_id: 254,
                        ..Default::default()
                    },
                    Team {
                        puuid: "red-bot-2".to_string(),
                        summoner_id: 0,
                        champion_id: 901,
                        ..Default::default()
                    },
                    Team {
                        puuid: "red-bot-3".to_string(),
                        summoner_id: 0,
                        champion_id: 68,
                        ..Default::default()
                    },
                    Team {
                        puuid: "red-bot-4".to_string(),
                        summoner_id: 0,
                        champion_id: 37,
                        ..Default::default()
                    },
                ],
                ..Default::default()
            },
            ..Default::default()
        });

        let allied_count = merged.iter().filter(|member| member.team == 200).count();
        let enemy_count = merged.iter().filter(|member| member.team == 100).count();

        assert_eq!(allied_count, 5);
        assert_eq!(enemy_count, 3);
        assert!(merged
            .iter()
            .any(|member| member.puuid == "local-red-puuid" && member.team == 200));
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
    fn team_players_skips_empty_puuid_and_zero_summoner_id() {
        let mut state = ManagerState::new();
        state.cached_team_members = vec![
            TeamMember {
                puuid: "ally-valid".to_string(),
                summoner_id: 11,
                team: 100,
                ..Default::default()
            },
            TeamMember {
                puuid: "".to_string(),
                summoner_id: 22,
                team: 100,
                ..Default::default()
            },
            TeamMember {
                puuid: "bot-assigned-uuid".to_string(),
                summoner_id: 0,
                team: 200,
                ..Default::default()
            },
            TeamMember {
                puuid: "ally-valid".to_string(),
                summoner_id: 11,
                team: 200,
                ..Default::default()
            },
        ];

        assert_eq!(state.team_players(), vec![("ally-valid".to_string(), 100)]);
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

    #[test]
    fn ingame_gameflow_roster_replaces_champ_select_roster_even_when_shorter() {
        let mut state = ManagerState::new();
        state.lifecycle_game_id = Some(42);
        state.cached_team_members = vec![
            TeamMember {
                team: 2,
                cell_id: 4,
                puuid: "ally-1".to_string(),
                ..Default::default()
            },
            TeamMember {
                team: 2,
                cell_id: 5,
                puuid: "ally-2".to_string(),
                ..Default::default()
            },
            TeamMember {
                team: 2,
                cell_id: 6,
                puuid: "ally-3".to_string(),
                ..Default::default()
            },
            TeamMember {
                team: 2,
                cell_id: 7,
                puuid: "ally-4".to_string(),
                ..Default::default()
            },
            TeamMember {
                team: 2,
                cell_id: 8,
                puuid: "ally-5".to_string(),
                ..Default::default()
            },
        ];

        let session = GameflowSessionData {
            phase: Phase::InProgress,
            game_data: GameData {
                game_id: 42,
                team_one: vec![Team {
                    puuid: "blue-ally".to_string(),
                    summoner_id: 11,
                    champion_id: 110,
                    ..Default::default()
                }],
                team_two: vec![Team {
                    puuid: "red-ally".to_string(),
                    summoner_id: 22,
                    champion_id: 222,
                    ..Default::default()
                }],
                ..Default::default()
            },
            ..Default::default()
        };

        let event_game_id = super::extract_gameflow_game_id(&session);
        assert!(state.can_apply_member_snapshot(event_game_id));

        let next_members = ManagerState::extract_gameflow_members(&session);
        state.cached_team_members = next_members;

        assert_eq!(state.cached_team_members.len(), 2);
        assert_eq!(state.cached_team_members[0].team, 100);
        assert_eq!(state.cached_team_members[1].team, 200);
    }
}
