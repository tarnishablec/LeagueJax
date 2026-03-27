use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::broadcast;
use tokio_util::sync::CancellationToken;

use crate::shards::lcu::events::champ_select_session::{
    ChampSelectSessionData, TeamMember as ChampSelectTeamMember,
};
use crate::shards::lcu::events::gameflow_session::{GameflowSessionData, Team as GameflowTeam};
use crate::shards::lcu::events::lobby::{LobbyData, Member as LobbyMember};
use crate::shards::lcu::events::{EventType, LanePosition, LcuWsEvent};
use crate::shards::lcu::session::LcuSession;
use crate::shards::ongoing_game::types::{
    OngoingGameContextInfo, OngoingGameMatchHistoryFilter, OngoingGamePhase, OngoingGameUpdated,
    PlayerSlot, Side,
};

use super::driver::OngoingGameDriver;

const DEFAULT_MATCH_HISTORY_COUNT: u32 = 50;
const MIN_MATCH_HISTORY_COUNT: u32 = 1;
const MAX_MATCH_HISTORY_COUNT: u32 = 200;

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

pub struct OngoingGameManager {
    event_tx: broadcast::Sender<OngoingGameUpdated>,
    state: Arc<tokio::sync::Mutex<ManagerState>>,
    cancel_token: CancellationToken,
}

struct ManagerState {
    driver: Option<OngoingGameDriver>,
    lcu_session: Option<Arc<LcuSession>>,
    active_phase_task: Option<CancellationToken>,
    context: OngoingGameContextInfo,
    match_history_filter: OngoingGameMatchHistoryFilter,
    match_history_count: u32,
    cached_positions_by_puuid: HashMap<String, CachedPositionInfo>,
    latest_champ_select_session: Option<ChampSelectSessionData>,
    cached_champ_select_team_members: Vec<ChampSelectTeamMember>,
    cached_champ_select_gameflow_session: Option<GameflowSessionData>,
    last_known_our_side: Option<Side>,
    next_task_id: u64,
    active_task_id: Option<u64>,
}

#[derive(Debug, Clone, Default)]
struct CachedPositionInfo {
    assigned: Option<String>,
    primary: Option<String>,
    secondary: Option<String>,
}

#[derive(Clone)]
struct PhaseChangeRequest {
    phase: OngoingGamePhase,
    lcu_session: Arc<LcuSession>,
    match_history_filter: OngoingGameMatchHistoryFilter,
}

#[derive(Clone)]
struct PhaseTaskRuntime {
    task_id: u64,
    phase: OngoingGamePhase,
    lcu_session: Arc<LcuSession>,
    match_history_filter: OngoingGameMatchHistoryFilter,
    cached_positions_by_puuid: HashMap<String, CachedPositionInfo>,
    last_known_our_side: Option<Side>,
}

#[derive(Clone)]
struct ActiveTaskEmitter {
    state: Arc<tokio::sync::Mutex<ManagerState>>,
    task_id: u64,
    event_tx: broadcast::Sender<OngoingGameUpdated>,
}

impl ActiveTaskEmitter {
    fn new(
        state: Arc<tokio::sync::Mutex<ManagerState>>,
        task_id: u64,
        event_tx: broadcast::Sender<OngoingGameUpdated>,
    ) -> Self {
        Self {
            state,
            task_id,
            event_tx,
        }
    }

    async fn is_active(&self) -> bool {
        let state = self.state.lock().await;
        state.active_task_id == Some(self.task_id)
    }

    async fn emit_updated(&self, payload: OngoingGameUpdated) -> bool {
        if !self.is_active().await {
            return false;
        }

        emit_updated(&self.event_tx, payload);
        true
    }
}

impl OngoingGameManager {
    pub fn new(cancel_token: CancellationToken) -> Self {
        let (event_tx, _) = broadcast::channel(64);
        Self {
            event_tx,
            state: Arc::new(tokio::sync::Mutex::new(ManagerState {
                driver: None,
                lcu_session: None,
                active_phase_task: None,
                context: OngoingGameContextInfo::default(),
                match_history_filter: OngoingGameMatchHistoryFilter::CurrentMode,
                match_history_count: DEFAULT_MATCH_HISTORY_COUNT,
                cached_positions_by_puuid: HashMap::new(),
                latest_champ_select_session: None,
                cached_champ_select_team_members: Vec::new(),
                cached_champ_select_gameflow_session: None,
                last_known_our_side: None,
                next_task_id: 1,
                active_task_id: None,
            })),
            cancel_token,
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<OngoingGameUpdated> {
        self.event_tx.subscribe()
    }

    pub async fn set_match_history_filter(&self, filter: OngoingGameMatchHistoryFilter) {
        {
            let mut state = self.state.lock().await;
            state.match_history_filter = filter;
            state.context.match_history_filter = filter;
            state.context.match_history_tag =
                resolve_match_history_tag(filter, state.context.queue_id.unwrap_or(0));
        }

        self.refresh_current().await;
    }

    pub async fn set_match_history_count(&self, count: u32) {
        let normalized = count.clamp(MIN_MATCH_HISTORY_COUNT, MAX_MATCH_HISTORY_COUNT);
        {
            let mut state = self.state.lock().await;
            state.match_history_count = normalized;
        }

        self.refresh_current().await;
    }

    pub async fn refresh_current(&self) {
        let request = {
            let state = self.state.lock().await;
            let Some(driver) = &state.driver else {
                return;
            };
            let Some(lcu_session) = state.lcu_session.clone() else {
                return;
            };

            Some(PhaseChangeRequest {
                phase: driver.current_phase(),
                lcu_session,
                match_history_filter: state.match_history_filter,
            })
        };

        let Some(request) = request else {
            return;
        };

        self.on_phase_changed(request).await;
    }

    pub async fn handle_focus_changed(
        &self,
        lcu_session: Option<Arc<LcuSession>>,
        _sgp_session: Option<Arc<crate::shards::sgp::session::SgpSession>>,
    ) {
        let context = {
            let mut state = self.state.lock().await;
            if let Some(token) = state.active_phase_task.take() {
                token.cancel();
            }
            state.active_task_id = None;
            state.driver = None;
            state.lcu_session = None;
            state.cached_positions_by_puuid.clear();
            state.latest_champ_select_session = None;
            state.cached_champ_select_team_members.clear();
            state.cached_champ_select_gameflow_session = None;
            state.last_known_our_side = None;
            state.context = OngoingGameContextInfo {
                match_history_filter: state.match_history_filter,
                ..OngoingGameContextInfo::default()
            };
            state.context.clone()
        };

        let Some(lcu) = lcu_session else {
            tracing::debug!("OngoingGame: no focused client, manager cleared");
            emit_updated(
                &self.event_tx,
                OngoingGameUpdated {
                    phase: OngoingGamePhase::Idle,
                    loading: false,
                    context,
                    gameflow_session: None,
                    team_members: Vec::new(),
                },
            );
            return;
        };

        let mut driver = OngoingGameDriver::new();

        let match_history_filter = {
            let state = self.state.lock().await;
            state.match_history_filter
        };

        match lcu.api().get_gameflow_phase().await {
            Ok(phase_str) => {
                let phase = map_gameflow_phase(phase_str.as_str());
                if let Some(new_phase) = driver.force_phase(phase) {
                    self.on_phase_changed(PhaseChangeRequest {
                        phase: new_phase,
                        lcu_session: lcu.clone(),
                        match_history_filter,
                    })
                    .await;
                }
            }
            Err(e) => {
                tracing::debug!("Failed to seed gameflow phase: {e}");
            }
        }

        let mut state = self.state.lock().await;
        state.driver = Some(driver);
        state.lcu_session = Some(lcu);

        tracing::info!("OngoingGame: manager initialized for focused client");
    }

    /// Called by the event receiver for each ws event from the focused client.
    pub async fn handle_ws_event(&self, event: LcuWsEvent) {
        let mut transition: Option<PhaseChangeRequest> = None;
        let mut should_refresh = false;
        let mut immediate_champ_select_payload: Option<OngoingGameUpdated> = None;
        let phase_hint = phase_hint_from_ws_event(&event);
        let has_active_task;

        {
            let mut state = self.state.lock().await;
            has_active_task = state.active_phase_task.is_some();
            match &event {
                LcuWsEvent::Lobby(payload) => merge_position_cache_from_lobby(
                    &mut state.cached_positions_by_puuid,
                    &payload.data,
                ),
                LcuWsEvent::GameflowSession(payload) => {
                    state.context = build_context_from_gameflow_session(
                        &payload.data,
                        state.match_history_filter,
                    );
                    should_refresh = true;
                }
                LcuWsEvent::ChampSelectSession(payload) => {
                    state.context = build_context_from_champ_select_session(
                        &payload.data,
                        state.match_history_filter,
                    );
                    if payload.event_type != EventType::Delete {
                        let (our_side_from_payload, mut blue_slots, mut red_slots) =
                            build_champ_select_phase_data(&payload.data, state.last_known_our_side);
                        if let Some(our_side) = our_side_from_payload {
                            state.last_known_our_side = Some(our_side);
                        }

                        apply_position_cache(&mut blue_slots, &state.cached_positions_by_puuid);
                        apply_position_cache(&mut red_slots, &state.cached_positions_by_puuid);
                        merge_position_cache_from_slots(
                            &mut state.cached_positions_by_puuid,
                            &blue_slots,
                            &red_slots,
                        );
                        let team_members = merge_team_members_with_slots(
                            &payload.data,
                            &collect_slots(blue_slots, red_slots),
                        );

                        state.latest_champ_select_session = Some(payload.data.clone());
                        state.cached_champ_select_team_members = team_members.clone();

                        let is_champ_select_phase = state
                            .driver
                            .as_ref()
                            .map(|driver| driver.current_phase() == OngoingGamePhase::ChampSelect)
                            .unwrap_or(false);
                        if is_champ_select_phase {
                            immediate_champ_select_payload = Some(OngoingGameUpdated {
                                phase: OngoingGamePhase::ChampSelect,
                                loading: false,
                                context: state.context.clone(),
                                gameflow_session: state.cached_champ_select_gameflow_session.clone(),
                                team_members,
                            });
                        }

                        should_refresh = state.active_task_id.is_none()
                            && state.cached_champ_select_gameflow_session.is_none();
                    } else {
                        state.latest_champ_select_session = None;
                        state.cached_champ_select_team_members.clear();
                        state.cached_champ_select_gameflow_session = None;
                    }
                }
                _ => {}
            }

            let Some(driver) = &mut state.driver else {
                return;
            };

            if let Some(new_phase) = phase_hint.and_then(|hinted| driver.force_phase(hinted)) {
                if let Some(lcu) = state.lcu_session.clone() {
                    transition = Some(PhaseChangeRequest {
                        phase: new_phase,
                        lcu_session: lcu,
                        match_history_filter: state.match_history_filter,
                    });
                }
            } else if let Some(new_phase) = driver.process(&event) {
                if let Some(lcu) = state.lcu_session.clone() {
                    transition = Some(PhaseChangeRequest {
                        phase: new_phase,
                        lcu_session: lcu,
                        match_history_filter: state.match_history_filter,
                    });
                }
            }
        }

        if let Some(request) = transition {
            self.on_phase_changed(request).await;
            return;
        }

        if let Some(payload) = immediate_champ_select_payload {
            emit_updated(&self.event_tx, payload);
        }

        if should_refresh && !has_active_task {
            self.refresh_current().await;
        }
    }

    // -----------------------------------------------------------------------
    // Phase change reaction
    // -----------------------------------------------------------------------

    async fn on_phase_changed(&self, request: PhaseChangeRequest) {
        let normalized_count = {
            let state = self.state.lock().await;
            state
                .match_history_count
                .clamp(MIN_MATCH_HISTORY_COUNT, MAX_MATCH_HISTORY_COUNT)
        };
        let (task_token, runtime, idle_payload) = {
            let mut state = self.state.lock().await;
            state.match_history_filter = request.match_history_filter;
            state.match_history_count = normalized_count;
            state.context.match_history_filter = request.match_history_filter;
            state.context.match_history_tag = resolve_match_history_tag(
                request.match_history_filter,
                state.context.queue_id.unwrap_or(0),
            );

            if let Some(token) = state.active_phase_task.take() {
                token.cancel();
            }

            if request.phase == OngoingGamePhase::Idle {
                state.cached_positions_by_puuid.clear();
                state.latest_champ_select_session = None;
                state.cached_champ_select_team_members.clear();
                state.cached_champ_select_gameflow_session = None;
                state.last_known_our_side = None;
                state.active_task_id = None;
                state.context = OngoingGameContextInfo {
                    match_history_filter: state.match_history_filter,
                    ..OngoingGameContextInfo::default()
                };
                (
                    None,
                    None,
                    Some(OngoingGameUpdated {
                        phase: OngoingGamePhase::Idle,
                        loading: false,
                        context: state.context.clone(),
                        gameflow_session: None,
                        team_members: Vec::new(),
                    }),
                )
            } else {
                if request.phase != OngoingGamePhase::ChampSelect {
                    state.cached_champ_select_team_members.clear();
                    state.cached_champ_select_gameflow_session = None;
                }
                let task_id = state.next_task_id;
                state.next_task_id = state.next_task_id.saturating_add(1);
                let token = self.cancel_token.child_token();
                state.active_phase_task = Some(token.clone());
                state.active_task_id = Some(task_id);
                (
                    Some(token),
                    Some(PhaseTaskRuntime {
                        task_id,
                        phase: request.phase,
                        lcu_session: request.lcu_session,
                        match_history_filter: request.match_history_filter,
                        cached_positions_by_puuid: state.cached_positions_by_puuid.clone(),
                        last_known_our_side: state.last_known_our_side,
                    }),
                    None,
                )
            }
        };

        if let Some(payload) = idle_payload {
            emit_updated(&self.event_tx, payload);
        }

        let Some(task_token) = task_token else {
            return;
        };
        let Some(runtime) = runtime else {
            return;
        };

        let event_tx = self.event_tx.clone();
        let state = self.state.clone();

        tokio::spawn(async move {
            tokio::select! {
                _ = task_token.cancelled() => {}
                _ = Self::fetch_phase_data(runtime, event_tx, state) => {}
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

impl OngoingGameManager {
    async fn fetch_phase_data(
        runtime: PhaseTaskRuntime,
        event_tx: broadcast::Sender<OngoingGameUpdated>,
        state: Arc<tokio::sync::Mutex<ManagerState>>,
    ) {
        let task_id = runtime.task_id;
        match runtime.phase {
            OngoingGamePhase::ChampSelect => {
                Self::fetch_champ_select_phase_data(runtime, event_tx, state.clone()).await;
            }
            OngoingGamePhase::InGame => {
                Self::fetch_in_game_phase_data(runtime, event_tx, state.clone()).await;
            }
            OngoingGamePhase::Idle => {}
        }

        let mut guard = state.lock().await;
        if guard.active_task_id == Some(task_id) {
            guard.active_task_id = None;
            guard.active_phase_task = None;
        }
    }

    async fn fetch_champ_select_phase_data(
        runtime: PhaseTaskRuntime,
        event_tx: broadcast::Sender<OngoingGameUpdated>,
        state: Arc<tokio::sync::Mutex<ManagerState>>,
    ) {
        let emitter = ActiveTaskEmitter::new(state.clone(), runtime.task_id, event_tx.clone());
        let cached_session = {
            let guard = state.lock().await;
            guard.latest_champ_select_session.clone()
        };

        let session = if let Some(cached) = cached_session {
            cached
        } else {
            match runtime.lcu_session.api().get_champ_select_session().await {
                Ok(session_value) => match serde_json::from_value::<ChampSelectSessionData>(session_value) {
                    Ok(session) => {
                        let mut guard = state.lock().await;
                        guard.latest_champ_select_session = Some(session.clone());
                        session
                    }
                    Err(error) => {
                        tracing::warn!("Failed to parse champ select session payload: {error}");
                        tracing::warn!(
                            "Skip champ select snapshot update because both live and cached sessions are unavailable"
                        );
                        return;
                    }
                },
                Err(e) => {
                    tracing::warn!("Failed to fetch champ select session: {e}");
                    tracing::warn!(
                        "Skip champ select snapshot update because both live and cached sessions are unavailable"
                    );
                    return;
                }
            }
        };

        let (our_side_from_payload, mut blue_slots, mut red_slots) =
            build_champ_select_phase_data(&session, runtime.last_known_our_side);
        apply_position_cache(&mut blue_slots, &runtime.cached_positions_by_puuid);
        apply_position_cache(&mut red_slots, &runtime.cached_positions_by_puuid);
        {
            let mut guard = state.lock().await;
            merge_position_cache_from_slots(
                &mut guard.cached_positions_by_puuid,
                &blue_slots,
                &red_slots,
            );
            if let Some(our_side) = our_side_from_payload {
                guard.last_known_our_side = Some(our_side);
            }
        }
        let team_members =
            merge_team_members_with_slots(&session, &collect_slots(blue_slots, red_slots));
        let (context, gameflow_session) = fetch_champ_select_context(
            &runtime.lcu_session,
            &session,
            runtime.match_history_filter,
        )
        .await;
        {
            let mut guard = state.lock().await;
            guard.cached_champ_select_team_members = team_members.clone();
            guard.cached_champ_select_gameflow_session = gameflow_session.clone();
        }

        let _ = emitter
            .emit_updated(OngoingGameUpdated {
                phase: OngoingGamePhase::ChampSelect,
                loading: false,
                context,
                gameflow_session,
                team_members,
            })
            .await;
    }

    async fn fetch_in_game_phase_data(
        runtime: PhaseTaskRuntime,
        event_tx: broadcast::Sender<OngoingGameUpdated>,
        state: Arc<tokio::sync::Mutex<ManagerState>>,
    ) {
        let emitter = ActiveTaskEmitter::new(state.clone(), runtime.task_id, event_tx.clone());
        match runtime.lcu_session.api().get_gameflow_session().await {
            Ok(session_value) => {
                let Some(session) = serde_json::from_value::<GameflowSessionData>(session_value).ok()
                else {
                    tracing::warn!("Failed to parse gameflow session payload");
                    return;
                };
                let context =
                    build_context_from_gameflow_session(&session, runtime.match_history_filter);

                let (mut blue_slots, mut red_slots) = build_in_game_phase_data(&session);
                apply_position_cache(&mut blue_slots, &runtime.cached_positions_by_puuid);
                apply_position_cache(&mut red_slots, &runtime.cached_positions_by_puuid);
                {
                    let mut guard = state.lock().await;
                    merge_position_cache_from_slots(
                        &mut guard.cached_positions_by_puuid,
                        &blue_slots,
                        &red_slots,
                    );
                }
                let all_slots = collect_slots(blue_slots, red_slots);
                let team_members = build_team_members_from_slots(&all_slots);
                let _ = emitter
                    .emit_updated(OngoingGameUpdated {
                        phase: OngoingGamePhase::InGame,
                        loading: false,
                        context,
                        gameflow_session: Some(session),
                        team_members,
                    })
                    .await;
            }
            Err(e) => {
                tracing::warn!("Failed to fetch gameflow session: {e}");
            }
        }
    }
}

fn queue_tag_from_queue_id(queue_id: i64) -> Option<String> {
    if queue_id > 0 && is_safe_match_history_queue(queue_id) {
        Some(format!("q_{queue_id}"))
    } else {
        None
    }
}

fn is_safe_match_history_queue(queue_id: i64) -> bool {
    matches!(
        queue_id,
        420 | 430 | 440 | 450 | 480 | 490 | 900 | 1400 | 1700 | 1900 | 2300
    )
}

fn option_non_empty(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn option_positive_u64(value: u64) -> Option<i64> {
    if value == 0 {
        None
    } else {
        i64::try_from(value).ok()
    }
}

fn resolve_match_history_tag(
    filter: OngoingGameMatchHistoryFilter,
    queue_id: i64,
) -> Option<String> {
    match filter {
        OngoingGameMatchHistoryFilter::CurrentMode => queue_tag_from_queue_id(queue_id),
        OngoingGameMatchHistoryFilter::All => None,
    }
}

fn build_context_from_gameflow_session(
    session: &GameflowSessionData,
    filter: OngoingGameMatchHistoryFilter,
) -> OngoingGameContextInfo {
    let queue_id = option_positive_u64(session.game_data.queue.id);
    let map_id = option_positive_u64(session.map.id)
        .or_else(|| option_positive_u64(session.game_data.queue.map_id));
    let match_history_tag = resolve_match_history_tag(filter, queue_id.unwrap_or(0));

    OngoingGameContextInfo {
        queue_id,
        queue_name: option_non_empty(&session.game_data.queue.name),
        queue_short_name: option_non_empty(&session.game_data.queue.short_name),
        map_id,
        map_name: option_non_empty(&session.map.name),
        game_mode: option_non_empty(&session.map.game_mode)
            .or_else(|| option_non_empty(&session.game_data.queue.game_mode)),
        game_mode_name: option_non_empty(&session.map.game_mode_name),
        game_mode_short_name: option_non_empty(&session.map.game_mode_short_name),
        match_history_filter: filter,
        match_history_tag,
    }
}

fn build_context_from_champ_select_session(
    session: &ChampSelectSessionData,
    filter: OngoingGameMatchHistoryFilter,
) -> OngoingGameContextInfo {
    let queue_id = option_positive_u64(session.queue_id);
    OngoingGameContextInfo {
        queue_id,
        queue_name: None,
        queue_short_name: None,
        map_id: None,
        map_name: None,
        game_mode: None,
        game_mode_name: None,
        game_mode_short_name: None,
        match_history_filter: filter,
        match_history_tag: resolve_match_history_tag(filter, queue_id.unwrap_or(0)),
    }
}

async fn fetch_champ_select_context(
    lcu_session: &Arc<LcuSession>,
    session: &ChampSelectSessionData,
    filter: OngoingGameMatchHistoryFilter,
) -> (OngoingGameContextInfo, Option<GameflowSessionData>) {
    let fallback = build_context_from_champ_select_session(session, filter);
    let Ok(gameflow_value) = lcu_session.api().get_gameflow_session().await else {
        return (fallback, None);
    };
    let Some(gameflow_session) = serde_json::from_value::<GameflowSessionData>(gameflow_value).ok()
    else {
        return (fallback, None);
    };
    let context = build_context_from_gameflow_session(&gameflow_session, filter);

    if context.queue_id.is_some() || context.map_id.is_some() {
        (context, Some(gameflow_session))
    } else {
        (fallback, Some(gameflow_session))
    }
}

fn collect_slots(mut blue_slots: Vec<PlayerSlot>, red_slots: Vec<PlayerSlot>) -> Vec<PlayerSlot> {
    blue_slots.extend(red_slots);
    blue_slots
}

fn merge_team_members_with_slots(
    session: &ChampSelectSessionData,
    slots: &[PlayerSlot],
) -> Vec<ChampSelectTeamMember> {
    let mut member_by_puuid: HashMap<&str, ChampSelectTeamMember> = session
        .my_team
        .iter()
        .chain(session.their_team.iter())
        .map(|member| (member.puuid.as_str(), member.clone()))
        .collect();

    slots
        .iter()
        .map(|slot| {
            let mut member = member_by_puuid
                .remove(slot.puuid.as_str())
                .unwrap_or_else(ChampSelectTeamMember::default);

            if let Some(champion_id) = slot.champion_id.and_then(|value| u64::try_from(value).ok()) {
                member.champion_id = champion_id;
                member.champion_pick_intent = champion_id;
            }

            if slot.is_bot {
                member.puuid = slot.puuid.clone();
            }

            if member.assigned_position.is_none() {
                member.assigned_position = slot
                    .position_assigned
                    .as_deref()
                    .and_then(lane_position_from_raw);
            }

            member.team = match slot.side {
                Side::Blue => 100,
                Side::Red => 200,
            };

            member
        })
        .collect()
}

fn build_team_members_from_slots(slots: &[PlayerSlot]) -> Vec<ChampSelectTeamMember> {
    slots
        .iter()
        .map(|slot| {
            let champion_id = slot
                .champion_id
                .and_then(|value| u64::try_from(value).ok())
                .unwrap_or_default();
            let assigned_position = slot
                .position_assigned
                .as_deref()
                .and_then(lane_position_from_raw)
                .unwrap_or_default();

            ChampSelectTeamMember {
                assigned_position: Some(assigned_position),
                champion_id,
                champion_pick_intent: champion_id,
                is_humanoid: !slot.is_bot,
                puuid: slot.puuid.clone(),
                summoner_id: if slot.is_bot { 0 } else { 1 },
                team: match slot.side {
                    Side::Blue => 100,
                    Side::Red => 200,
                },
                ..ChampSelectTeamMember::default()
            }
        })
        .collect()
}

fn emit_updated(event_tx: &broadcast::Sender<OngoingGameUpdated>, payload: OngoingGameUpdated) {
    let _ = event_tx.send(payload);
}

fn map_gameflow_phase(value: &str) -> OngoingGamePhase {
    match value {
        "ChampSelect" => OngoingGamePhase::ChampSelect,
        "GameStart" | "InProgress" | "InGame" => OngoingGamePhase::InGame,
        _ => OngoingGamePhase::Idle,
    }
}

fn phase_hint_from_ws_event(event: &LcuWsEvent) -> Option<OngoingGamePhase> {
    match event {
        LcuWsEvent::ChampSelectSession(payload) => {
            if payload.event_type == EventType::Delete {
                Some(OngoingGamePhase::Idle)
            } else {
                Some(OngoingGamePhase::ChampSelect)
            }
        }
        LcuWsEvent::GameflowSession(payload) => {
            let hinted = map_gameflow_phase(payload.data.phase.as_str());
            (hinted != OngoingGamePhase::Idle).then_some(hinted)
        }
        _ => None,
    }
}

fn side_from_team_id(team_id: i64) -> Option<Side> {
    match team_id {
        1 => Some(Side::Blue),
        2 => Some(Side::Red),
        100 => Some(Side::Blue),
        200 => Some(Side::Red),
        _ => None,
    }
}

fn opposite_side(side: Side) -> Side {
    match side {
        Side::Blue => Side::Red,
        Side::Red => Side::Blue,
    }
}

fn champion_id_option(champion_id: i64) -> Option<i64> {
    if champion_id > 0 {
        Some(champion_id)
    } else {
        None
    }
}

fn normalize_position_value(raw: &str) -> Option<String> {
    lane_position_from_raw(raw).map(normalize_lane_position)
}

fn lane_position_from_raw(raw: &str) -> Option<LanePosition> {
    let upper = raw.trim().to_ascii_uppercase();
    match upper.as_str() {
        "TOP" => Some(LanePosition::Top),
        "JUNGLE" | "JG" => Some(LanePosition::Jungle),
        "MIDDLE" | "MID" => Some(LanePosition::Middle),
        "BOTTOM" | "BOT" | "ADC" => Some(LanePosition::Bottom),
        "UTILITY" | "SUPPORT" | "SUP" => Some(LanePosition::Utility),
        _ => None,
    }
}

fn normalize_lane_position(position: LanePosition) -> String {
    position.as_normalized().to_string()
}

fn apply_position_cache(
    slots: &mut [PlayerSlot],
    positions_by_puuid: &HashMap<String, CachedPositionInfo>,
) {
    for slot in slots {
        let Some(position) = positions_by_puuid.get(&slot.puuid) else {
            continue;
        };

        if slot.position_assigned.is_none() {
            slot.position_assigned = position.assigned.clone();
        }
        if slot.position_primary.is_none() {
            slot.position_primary = position.primary.clone();
        }
        if slot.position_secondary.is_none() {
            slot.position_secondary = position.secondary.clone();
        }
    }
}

fn merge_position_cache_from_slots(
    positions_by_puuid: &mut HashMap<String, CachedPositionInfo>,
    blue_slots: &[PlayerSlot],
    red_slots: &[PlayerSlot],
) {
    for slot in blue_slots.iter().chain(red_slots.iter()) {
        let entry = positions_by_puuid.entry(slot.puuid.clone()).or_default();

        if slot.position_assigned.is_some() {
            entry.assigned = slot.position_assigned.clone();
        }
        if slot.position_primary.is_some() {
            entry.primary = slot.position_primary.clone();
        }
        if slot.position_secondary.is_some() {
            entry.secondary = slot.position_secondary.clone();
        }
    }
}

fn merge_position_cache_from_lobby(
    positions_by_puuid: &mut HashMap<String, CachedPositionInfo>,
    payload: &LobbyData,
) {
    for member in &payload.members {
        for key in lobby_member_position_keys(member) {
            let entry = positions_by_puuid.entry(key).or_default();

            if let Some(primary) = normalize_position_value(&member.first_position_preference) {
                entry.primary = Some(primary);
            }
            if let Some(secondary) = normalize_position_value(&member.second_position_preference) {
                entry.secondary = Some(secondary);
            }
            if let Some(assigned) = normalize_position_value(&member.bot_position) {
                entry.assigned = Some(assigned);
            }
        }
    }
}

fn lobby_member_position_keys(member: &LobbyMember) -> Vec<String> {
    let mut keys: Vec<String> = Vec::new();
    let puuid = member.puuid.trim();
    if !puuid.is_empty() {
        keys.push(puuid.to_string());
        if member.is_bot {
            keys.push(format!("BOT_{}", puuid.to_ascii_uppercase()));
        }
    }

    let bot_id = member.bot_id.trim();
    if !bot_id.is_empty() {
        keys.push(format!("BOT_{}", bot_id.to_ascii_uppercase()));
        keys.push(bot_id.to_string());
    }

    keys
}

fn push_player_slot(
    blue_players: &mut Vec<PlayerSlot>,
    red_players: &mut Vec<PlayerSlot>,
    slot: PlayerSlot,
) {
    if slot.puuid.is_empty() {
        return;
    }

    match slot.side {
        Side::Blue => blue_players.push(slot),
        Side::Red => red_players.push(slot),
    }
}

fn build_champ_select_phase_data(
    session: &ChampSelectSessionData,
    fallback_our_side: Option<Side>,
) -> (Option<Side>, Vec<PlayerSlot>, Vec<PlayerSlot>) {
    let parsed_our_side = if session.is_spectating {
        None
    } else {
        session
            .my_team
            .iter()
            .find(|player| i64::try_from(player.cell_id).ok() == Some(session.local_player_cell_id))
            .and_then(|player| side_from_team_id(i64::try_from(player.team).unwrap_or_default()))
            .or_else(|| {
                session.my_team.first().and_then(|player| {
                    side_from_team_id(i64::try_from(player.team).unwrap_or_default())
                })
            })
    };
    let our_side = parsed_our_side.or(fallback_our_side);

    let my_default_side = our_side.unwrap_or(Side::Blue);
    let their_default_side = opposite_side(my_default_side);

    let mut blue_players = Vec::new();
    let mut red_players = Vec::new();

    for player in &session.my_team {
        push_champ_select_player_slot(&mut blue_players, &mut red_players, player, my_default_side);
    }

    for player in &session.their_team {
        push_champ_select_player_slot(
            &mut blue_players,
            &mut red_players,
            player,
            their_default_side,
        );
    }

    (our_side, blue_players, red_players)
}

fn push_champ_select_player_slot(
    blue_players: &mut Vec<PlayerSlot>,
    red_players: &mut Vec<PlayerSlot>,
    player: &ChampSelectTeamMember,
    fallback_side: Side,
) {
    let side =
        side_from_team_id(i64::try_from(player.team).unwrap_or_default()).unwrap_or(fallback_side);
    let is_bot = !champ_select_member_has_human_identity(player);
    let normalized_puuid = if is_bot {
        normalize_bot_puuid(player)
    } else {
        player.puuid.clone()
    };

    push_player_slot(
        blue_players,
        red_players,
        PlayerSlot {
            puuid: normalized_puuid,
            champion_id: champion_id_option(i64::try_from(player.champion_id).unwrap_or_default())
                .or_else(|| {
                    champion_id_option(
                        i64::try_from(player.champion_pick_intent).unwrap_or_default(),
                    )
                }),
            is_bot,
            position_assigned: player.assigned_position.map(normalize_lane_position),
            position_primary: None,
            position_secondary: None,
            side,
        },
    );
}

fn champ_select_member_has_human_identity(member: &ChampSelectTeamMember) -> bool {
    member.summoner_id > 0
        || !member.game_name.trim().is_empty()
        || !member.tag_line.trim().is_empty()
}

fn normalize_bot_puuid(member: &ChampSelectTeamMember) -> String {
    let raw_puuid = member.puuid.trim();
    if raw_puuid.is_empty() {
        return format!("BOT_TEAM{}_CELL{}", member.team, member.cell_id);
    }

    format!("BOT_{}", raw_puuid.to_ascii_uppercase())
}

fn build_in_game_phase_data(session: &GameflowSessionData) -> (Vec<PlayerSlot>, Vec<PlayerSlot>) {
    let mut champion_by_puuid: HashMap<String, i64> = HashMap::new();
    for selection in &session.game_data.player_champion_selections {
        if selection.puuid.is_empty() || selection.champion_id <= 0 {
            continue;
        }
        champion_by_puuid.insert(selection.puuid.clone(), selection.champion_id);
    }

    let mut blue_players = Vec::new();
    let mut red_players = Vec::new();

    for player in &session.game_data.team_one {
        push_gameflow_player_slot(
            &mut blue_players,
            &mut red_players,
            player,
            Side::Blue,
            &champion_by_puuid,
        );
    }

    for player in &session.game_data.team_two {
        push_gameflow_player_slot(
            &mut blue_players,
            &mut red_players,
            player,
            Side::Red,
            &champion_by_puuid,
        );
    }

    (blue_players, red_players)
}

fn push_gameflow_player_slot(
    blue_players: &mut Vec<PlayerSlot>,
    red_players: &mut Vec<PlayerSlot>,
    player: &GameflowTeam,
    side: Side,
    champion_by_puuid: &HashMap<String, i64>,
) {
    let champion_id = champion_id_option(i64::try_from(player.champion_id).unwrap_or_default())
        .or_else(|| {
            champion_by_puuid
                .get(&player.puuid)
                .copied()
                .and_then(champion_id_option)
        });

    push_player_slot(
        blue_players,
        red_players,
        PlayerSlot {
            puuid: player.puuid.clone(),
            champion_id,
            is_bot: player.summoner_id == 0 || player.puuid.to_ascii_uppercase().starts_with("BOT_"),
            position_assigned: Some(normalize_lane_position(player.selected_position)),
            position_primary: None,
            position_secondary: None,
            side,
        },
    );
}
