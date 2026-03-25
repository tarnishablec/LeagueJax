use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::broadcast;
use tokio::task::JoinSet;
use tokio_util::sync::CancellationToken;

use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::watcher::LcuWsEvent;
use crate::shards::lcu::ws_event_types::{
    parse_champ_select_session_event, parse_champ_select_session_value,
    parse_gameflow_session_event, parse_gameflow_session_value, parse_parties_notification_event,
    LcuChampSelectPlayer, LcuChampSelectSessionEvent, LcuChampSelectSessionPayload,
    LcuGameflowSessionPayload, LcuGameflowTeamPlayer, LcuPartiesBotParticipant,
};
use crate::shards::ongoing_game::types::{
    OngoingGameContextInfo, OngoingGameMatchHistoryFilter, OngoingGamePhase,
    OngoingGamePhaseChanged, OngoingGamePlayerSnapshot, OngoingGameSnapshotUpdated, PlayerSlot,
    Side,
};
use crate::shards::sgp::session::SgpSession;

use super::driver::OngoingGameDriver;

const DEFAULT_MATCH_HISTORY_COUNT: u32 = 50;
const MIN_MATCH_HISTORY_COUNT: u32 = 1;
const MAX_MATCH_HISTORY_COUNT: u32 = 200;

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub enum OngoingGameManagerEvent {
    PhaseChanged(OngoingGamePhaseChanged),
    SnapshotUpdated(OngoingGameSnapshotUpdated),
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

pub struct OngoingGameManager {
    event_tx: broadcast::Sender<OngoingGameManagerEvent>,
    state: tokio::sync::Mutex<ManagerState>,
    cancel_token: CancellationToken,
}

struct ManagerState {
    driver: Option<OngoingGameDriver>,
    lcu_session: Option<Arc<LcuSession>>,
    sgp_session: Option<Arc<SgpSession>>,
    focused_puuid: Option<String>,
    active_phase_task: Option<CancellationToken>,
    context: OngoingGameContextInfo,
    match_history_filter: OngoingGameMatchHistoryFilter,
    match_history_count: u32,
    cached_bot_slots: Vec<PlayerSlot>,
    cached_bot_ids: Vec<String>,
}

impl OngoingGameManager {
    pub fn new(cancel_token: CancellationToken) -> Self {
        let (event_tx, _) = broadcast::channel(64);
        Self {
            event_tx,
            state: tokio::sync::Mutex::new(ManagerState {
                driver: None,
                lcu_session: None,
                sgp_session: None,
                focused_puuid: None,
                active_phase_task: None,
                context: OngoingGameContextInfo::default(),
                match_history_filter: OngoingGameMatchHistoryFilter::CurrentMode,
                match_history_count: DEFAULT_MATCH_HISTORY_COUNT,
                cached_bot_slots: Vec::new(),
                cached_bot_ids: Vec::new(),
            }),
            cancel_token,
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<OngoingGameManagerEvent> {
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
        let next = {
            let state = self.state.lock().await;
            let Some(driver) = &state.driver else {
                return;
            };
            let Some(lcu_session) = state.lcu_session.clone() else {
                return;
            };

            Some((
                driver.current_phase(),
                lcu_session,
                state.sgp_session.clone(),
                state.focused_puuid.clone(),
                state.match_history_filter,
                state.match_history_count,
            ))
        };

        let Some((phase, lcu_session, sgp_session, focused_puuid, filter, count)) = next else {
            return;
        };

        self.on_phase_changed(
            phase,
            lcu_session,
            sgp_session,
            focused_puuid,
            filter,
            count,
        )
        .await;
    }

    pub async fn handle_focus_changed(
        &self,
        lcu_session: Option<Arc<LcuSession>>,
        sgp_session: Option<Arc<SgpSession>>,
    ) {
        let context = {
            let mut state = self.state.lock().await;
            if let Some(token) = state.active_phase_task.take() {
                token.cancel();
            }
            state.driver = None;
            state.lcu_session = None;
            state.sgp_session = None;
            state.focused_puuid = None;
            state.cached_bot_slots.clear();
            state.cached_bot_ids.clear();
            state.context = OngoingGameContextInfo {
                match_history_filter: state.match_history_filter,
                ..OngoingGameContextInfo::default()
            };
            state.context.clone()
        };

        let Some(lcu) = lcu_session else {
            tracing::debug!("OngoingGame: no focused client, manager cleared");
            emit_phase_changed(
                &self.event_tx,
                OngoingGamePhase::Idle,
                false,
                None,
                context.clone(),
                Vec::new(),
                Vec::new(),
            );
            emit_snapshot_updated(
                &self.event_tx,
                OngoingGamePhase::Idle,
                false,
                None,
                context,
                Vec::new(),
                Vec::new(),
            );
            return;
        };

        let mut driver = OngoingGameDriver::new();

        let focused_puuid = match lcu.api().get_current_summoner().await {
            Ok(summoner) => Some(summoner.puuid),
            Err(e) => {
                tracing::debug!("Failed to seed current summoner: {e}");
                None
            }
        };

        let (match_history_filter, match_history_count) = {
            let state = self.state.lock().await;
            (state.match_history_filter, state.match_history_count)
        };

        match lcu.api().get_gameflow_phase().await {
            Ok(phase_str) => {
                let phase = map_gameflow_phase(phase_str.as_str());
                if let Some(new_phase) = driver.force_phase(phase) {
                    self.on_phase_changed(
                        new_phase,
                        lcu.clone(),
                        sgp_session.clone(),
                        focused_puuid.clone(),
                        match_history_filter,
                        match_history_count,
                    )
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
        state.sgp_session = sgp_session;
        state.focused_puuid = focused_puuid;

        tracing::info!("OngoingGame: manager initialized for focused client");
    }

    /// Called by the event receiver for each ws event from the focused client.
    pub async fn handle_ws_event(&self, event: LcuWsEvent) {
        #[allow(clippy::type_complexity)]
        let mut transition: Option<(
            OngoingGamePhase,
            Arc<LcuSession>,
            Option<Arc<SgpSession>>,
            Option<String>,
            OngoingGameMatchHistoryFilter,
            u32,
        )> = None;
        let mut ws_phase_update: Option<OngoingGamePhaseChanged> = None;

        {
            let mut state = self.state.lock().await;
            if let Some(participants) = parse_parties_notification_event(&event) {
                state.cached_bot_ids = participants
                    .iter()
                    .map(|participant| participant.bot_id.trim().to_string())
                    .filter(|id| !id.is_empty())
                    .collect();
                state.cached_bot_slots = build_bot_slots_from_parties(&participants);
            }
            if let Some(gameflow) = parse_gameflow_session_event(&event) {
                state.context =
                    build_context_from_gameflow_session(&gameflow, state.match_history_filter);
            } else if let Some(LcuChampSelectSessionEvent::Snapshot(session)) =
                parse_champ_select_session_event(&event)
            {
                state.context =
                    build_context_from_champ_select_session(&session, state.match_history_filter);
            }

            let Some(driver) = &mut state.driver else {
                return;
            };

            if let Some(new_phase) = driver.process(&event) {
                if let Some(lcu) = state.lcu_session.clone() {
                    transition = Some((
                        new_phase,
                        lcu,
                        state.sgp_session.clone(),
                        state.focused_puuid.clone(),
                        state.match_history_filter,
                        state.match_history_count,
                    ));
                }
            } else {
                ws_phase_update = build_phase_update_from_ws(
                    driver.current_phase(),
                    &event,
                    state.focused_puuid.as_deref(),
                    state.context.clone(),
                    &state.cached_bot_slots,
                    &state.cached_bot_ids,
                );
            }
        }

        if let Some((new_phase, lcu, sgp, focused_puuid, filter, count)) = transition {
            self.on_phase_changed(new_phase, lcu, sgp, focused_puuid, filter, count)
                .await;
            return;
        }

        if let Some(payload) = ws_phase_update {
            let _ = self
                .event_tx
                .send(OngoingGameManagerEvent::PhaseChanged(payload));
        }
    }

    // -----------------------------------------------------------------------
    // Phase change reaction
    // -----------------------------------------------------------------------

    async fn on_phase_changed(
        &self,
        phase: OngoingGamePhase,
        lcu_session: Arc<LcuSession>,
        sgp_session: Option<Arc<SgpSession>>,
        focused_puuid: Option<String>,
        match_history_filter: OngoingGameMatchHistoryFilter,
        match_history_count: u32,
    ) {
        let normalized_count = match_history_count.clamp(MIN_MATCH_HISTORY_COUNT, MAX_MATCH_HISTORY_COUNT);
        let (task_token, context, cached_bot_slots, cached_bot_ids) = {
            let mut state = self.state.lock().await;
            state.match_history_filter = match_history_filter;
            state.match_history_count = normalized_count;
            state.context.match_history_filter = match_history_filter;
            state.context.match_history_tag =
                resolve_match_history_tag(match_history_filter, state.context.queue_id.unwrap_or(0));

            if let Some(token) = state.active_phase_task.take() {
                token.cancel();
            }

            if phase == OngoingGamePhase::Idle {
                state.cached_bot_slots.clear();
                state.cached_bot_ids.clear();
                state.context = OngoingGameContextInfo {
                    match_history_filter: state.match_history_filter,
                    ..OngoingGameContextInfo::default()
                };
                (None, state.context.clone(), Vec::new(), Vec::new())
            } else {
                let token = self.cancel_token.child_token();
                state.active_phase_task = Some(token.clone());
                (
                    Some(token),
                    state.context.clone(),
                    state.cached_bot_slots.clone(),
                    state.cached_bot_ids.clone(),
                )
            }
        };

        emit_phase_changed(
            &self.event_tx,
            phase,
            phase != OngoingGamePhase::Idle,
            None,
            context,
            Vec::new(),
            Vec::new(),
        );

        let Some(task_token) = task_token else {
            return;
        };

        let event_tx = self.event_tx.clone();

        tokio::spawn(async move {
            tokio::select! {
                _ = task_token.cancelled() => {}
                _ = fetch_phase_data(phase, lcu_session, sgp_session, focused_puuid, match_history_filter, normalized_count, cached_bot_slots, cached_bot_ids, event_tx) => {}
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async fn fetch_phase_data(
    phase: OngoingGamePhase,
    lcu_session: Arc<LcuSession>,
    sgp_session: Option<Arc<SgpSession>>,
    focused_puuid: Option<String>,
    match_history_filter: OngoingGameMatchHistoryFilter,
    match_history_count: u32,
    cached_bot_slots: Vec<PlayerSlot>,
    cached_bot_ids: Vec<String>,
    event_tx: broadcast::Sender<OngoingGameManagerEvent>,
) {
    match phase {
        OngoingGamePhase::ChampSelect => {
            fetch_champ_select_phase_data(
                lcu_session,
                sgp_session,
                focused_puuid,
                match_history_filter,
                match_history_count,
                cached_bot_ids,
                event_tx,
            )
            .await;
        }
        OngoingGamePhase::InGame => {
            fetch_in_game_phase_data(
                lcu_session,
                sgp_session,
                focused_puuid,
                match_history_filter,
                match_history_count,
                cached_bot_slots,
                cached_bot_ids,
                event_tx,
            )
            .await;
        }
        OngoingGamePhase::Idle => {}
    }
}

async fn fetch_champ_select_phase_data(
    lcu_session: Arc<LcuSession>,
    sgp_session: Option<Arc<SgpSession>>,
    focused_puuid: Option<String>,
    match_history_filter: OngoingGameMatchHistoryFilter,
    match_history_count: u32,
    cached_bot_ids: Vec<String>,
    event_tx: broadcast::Sender<OngoingGameManagerEvent>,
) {
    let sgp_session = ensure_sgp_session(&lcu_session, sgp_session).await;

    match lcu_session.api().get_champ_select_session().await {
        Ok(session_value) => {
            let Some(session) = parse_champ_select_session_value(&session_value) else {
                tracing::warn!("Failed to parse champ select session payload");
                let context = OngoingGameContextInfo {
                    match_history_filter,
                    ..OngoingGameContextInfo::default()
                };
                emit_phase_changed(
                    &event_tx,
                    OngoingGamePhase::ChampSelect,
                    false,
                    None,
                    context,
                    Vec::new(),
                    Vec::new(),
                );
                return;
            };
            let context =
                fetch_champ_select_context(&lcu_session, &session, match_history_filter).await;
            let queue_tag = context.match_history_tag.clone();

            let (our_side_from_payload, mut blue_slots, mut red_slots) =
                build_champ_select_phase_data(&session);
            normalize_bot_slots(&mut blue_slots, &cached_bot_ids);
            normalize_bot_slots(&mut red_slots, &cached_bot_ids);
            let our_side = focused_puuid
                .as_deref()
                .and_then(|puuid| side_for_puuid(puuid, &blue_slots, &red_slots))
                .or(our_side_from_payload);
            let phase_blue_slots = blue_slots.clone();
            let phase_red_slots = red_slots.clone();

            emit_phase_changed(
                &event_tx,
                OngoingGamePhase::ChampSelect,
                true,
                our_side,
                context.clone(),
                blue_slots.clone(),
                red_slots.clone(),
            );

            let (own_slots, _) = split_team_slots(our_side, blue_slots, red_slots);
            let own_players = fetch_team_players(
                lcu_session,
                sgp_session,
                own_slots,
                queue_tag.as_deref(),
                match_history_count,
            )
            .await;
            let (blue_players, red_players) = merge_players_by_side(own_players, Vec::new());

            emit_snapshot_updated(
                &event_tx,
                OngoingGamePhase::ChampSelect,
                false,
                our_side,
                context.clone(),
                blue_players,
                red_players,
            );

            emit_phase_changed(
                &event_tx,
                OngoingGamePhase::ChampSelect,
                false,
                our_side,
                context,
                phase_blue_slots,
                phase_red_slots,
            );
        }
        Err(e) => {
            tracing::warn!("Failed to fetch champ select session: {e}");
        }
    }
}

async fn fetch_in_game_phase_data(
    lcu_session: Arc<LcuSession>,
    sgp_session: Option<Arc<SgpSession>>,
    focused_puuid: Option<String>,
    match_history_filter: OngoingGameMatchHistoryFilter,
    match_history_count: u32,
    cached_bot_slots: Vec<PlayerSlot>,
    cached_bot_ids: Vec<String>,
    event_tx: broadcast::Sender<OngoingGameManagerEvent>,
) {
    let sgp_session = ensure_sgp_session(&lcu_session, sgp_session).await;

    match lcu_session.api().get_gameflow_session().await {
        Ok(session_value) => {
            let Some(session) = parse_gameflow_session_value(&session_value) else {
                tracing::warn!("Failed to parse gameflow session payload");
                let context = OngoingGameContextInfo {
                    match_history_filter,
                    ..OngoingGameContextInfo::default()
                };
                emit_phase_changed(
                    &event_tx,
                    OngoingGamePhase::InGame,
                    false,
                    None,
                    context,
                    Vec::new(),
                    Vec::new(),
                );
                return;
            };
            let context = build_context_from_gameflow_session(&session, match_history_filter);
            let queue_tag = context.match_history_tag.clone();

            let (mut blue_slots, mut red_slots) = merge_slots_with_cached_bots(
                build_in_game_phase_data(&session),
                &cached_bot_slots,
            );
            normalize_bot_slots(&mut blue_slots, &cached_bot_ids);
            normalize_bot_slots(&mut red_slots, &cached_bot_ids);
            let our_side = focused_puuid
                .as_deref()
                .and_then(|puuid| side_for_puuid(puuid, &blue_slots, &red_slots));
            let phase_blue_slots = blue_slots.clone();
            let phase_red_slots = red_slots.clone();

            emit_phase_changed(
                &event_tx,
                OngoingGamePhase::InGame,
                true,
                our_side,
                context.clone(),
                blue_slots.clone(),
                red_slots.clone(),
            );

            let (own_slots, enemy_slots) = split_team_slots(our_side, blue_slots, red_slots);

            let own_players =
                fetch_team_players(
                    lcu_session.clone(),
                    sgp_session.clone(),
                    own_slots,
                    queue_tag.as_deref(),
                    match_history_count,
                )
                .await;
            let (blue_players, red_players) = merge_players_by_side(own_players, Vec::new());
            emit_snapshot_updated(
                &event_tx,
                OngoingGamePhase::InGame,
                true,
                our_side,
                context.clone(),
                blue_players.clone(),
                red_players.clone(),
            );

            let enemy_players = fetch_team_players(
                lcu_session,
                sgp_session,
                enemy_slots,
                queue_tag.as_deref(),
                match_history_count,
            )
            .await;
            let (blue_players, red_players) = merge_players_by_side(
                collect_players_from_sides(blue_players, red_players),
                enemy_players,
            );

            emit_snapshot_updated(
                &event_tx,
                OngoingGamePhase::InGame,
                false,
                our_side,
                context.clone(),
                blue_players,
                red_players,
            );

            emit_phase_changed(
                &event_tx,
                OngoingGamePhase::InGame,
                false,
                our_side,
                context,
                phase_blue_slots,
                phase_red_slots,
            );
        }
        Err(e) => {
            tracing::warn!("Failed to fetch gameflow session: {e}");
        }
    }
}

async fn fetch_team_players(
    lcu_session: Arc<LcuSession>,
    sgp_session: Option<Arc<SgpSession>>,
    slots: Vec<PlayerSlot>,
    queue_tag: Option<&str>,
    match_history_count: u32,
) -> Vec<OngoingGamePlayerSnapshot> {
    let candidates: Vec<PlayerFetchCandidate> = slots
        .into_iter()
        .filter(|slot| !is_bot_slot(slot))
        .map(PlayerFetchCandidate::from)
        .collect();

    if candidates.is_empty() {
        return Vec::new();
    }

    let mut ordered: Vec<Option<OngoingGamePlayerSnapshot>> =
        (0..candidates.len()).map(|_| None).collect();
    let mut joins = JoinSet::new();

    for (idx, candidate) in candidates.into_iter().enumerate() {
        let lcu = lcu_session.clone();
        let sgp = sgp_session.clone();
        let queue_tag = queue_tag.map(ToOwned::to_owned);
        joins.spawn(async move {
            let player = fetch_player_snapshot(
                lcu,
                sgp,
                candidate,
                queue_tag.as_deref(),
                match_history_count,
            )
            .await;
            (idx, player)
        });
    }

    while let Some(result) = joins.join_next().await {
        match result {
            Ok((idx, Some(player))) => {
                ordered[idx] = Some(player);
            }
            Ok((_idx, None)) => {}
            Err(e) => {
                tracing::debug!("Team player fetch task failed: {e}");
            }
        }
    }

    ordered.into_iter().flatten().collect()
}

async fn ensure_sgp_session(
    lcu_session: &Arc<LcuSession>,
    sgp_session: Option<Arc<SgpSession>>,
) -> Option<Arc<SgpSession>> {
    if sgp_session.is_some() {
        return sgp_session;
    }

    match SgpSession::new(lcu_session).await {
        Ok(session) => {
            tracing::debug!("OngoingGame: lazily initialized SGP session");
            Some(Arc::new(session))
        }
        Err(error) => {
            tracing::warn!("OngoingGame: failed to initialize SGP session lazily: {error}");
            None
        }
    }
}

async fn fetch_player_snapshot(
    lcu_session: Arc<LcuSession>,
    sgp_session: Option<Arc<SgpSession>>,
    candidate: PlayerFetchCandidate,
    queue_tag: Option<&str>,
    match_history_count: u32,
) -> Option<OngoingGamePlayerSnapshot> {
    let summoner = match lcu_session
        .api()
        .get_summoner_by_puuid(&candidate.puuid)
        .await
    {
        Ok(value) => value,
        Err(e) => {
            tracing::debug!(
                "Skip player {} while fetching summoner info, likely bot or unavailable: {e}",
                candidate.puuid
            );
            return None;
        }
    };

    let ranked_fut = async {
        lcu_session
            .api()
            .get_ranked_stats(&candidate.puuid)
            .await
            .ok()
    };
    let mastery_fut = async {
        lcu_session
            .api()
            .get_champion_mastery_by_puuid(&candidate.puuid)
            .await
            .ok()
    };
    let match_history_fut = async {
        if let Some(sgp) = &sgp_session {
            let first_result = sgp
                .api()
                .get_match_summaries(
                    &candidate.puuid,
                    0,
                    match_history_count,
                    queue_tag,
                    None,
                )
                .await;

            match first_result {
                Ok(response) => {
                    if queue_tag.is_some() && response.games.is_empty() {
                        match sgp
                            .api()
                            .get_match_summaries(
                                &candidate.puuid,
                                0,
                                match_history_count,
                                None,
                                None,
                            )
                            .await
                        {
                            Ok(fallback) => Some(fallback),
                            Err(error) => {
                                tracing::debug!(
                                    "OngoingGame: fallback match history fetch failed for {}: {error}",
                                    candidate.puuid
                                );
                                Some(response)
                            }
                        }
                    } else {
                        Some(response)
                    }
                }
                Err(error) => {
                    tracing::debug!(
                        "OngoingGame: match history fetch failed for {} tag={:?}: {error}",
                        candidate.puuid,
                        queue_tag
                    );
                    if queue_tag.is_some() {
                        match sgp
                            .api()
                            .get_match_summaries(
                                &candidate.puuid,
                                0,
                                match_history_count,
                                None,
                                None,
                            )
                            .await
                        {
                            Ok(fallback) => Some(fallback),
                            Err(fallback_error) => {
                                tracing::debug!(
                                    "OngoingGame: fallback match history fetch failed for {}: {fallback_error}",
                                    candidate.puuid
                                );
                                None
                            }
                        }
                    } else {
                        None
                    }
                }
            }
        } else {
            tracing::debug!(
                "OngoingGame: skip match history fetch for {} because SGP session is unavailable",
                candidate.puuid
            );
            None
        }
    };

    let (ranked, champion_mastery, match_history) =
        tokio::join!(ranked_fut, mastery_fut, match_history_fut);

    Some(OngoingGamePlayerSnapshot {
        puuid: candidate.puuid,
        side: candidate.side,
        champion_id: candidate.champion_id,
        summoner,
        ranked,
        match_history,
        champion_mastery,
    })
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

fn option_positive(value: i64) -> Option<i64> {
    if value > 0 {
        Some(value)
    } else {
        None
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
    session: &LcuGameflowSessionPayload,
    filter: OngoingGameMatchHistoryFilter,
) -> OngoingGameContextInfo {
    let queue_id = option_positive(session.game_data.queue.id);
    let map_id = option_positive(session.map.id).or_else(|| option_positive(session.game_data.queue.map_id));
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
    session: &LcuChampSelectSessionPayload,
    filter: OngoingGameMatchHistoryFilter,
) -> OngoingGameContextInfo {
    let queue_id = option_positive(session.queue_id);
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
    session: &LcuChampSelectSessionPayload,
    filter: OngoingGameMatchHistoryFilter,
) -> OngoingGameContextInfo {
    let fallback = build_context_from_champ_select_session(session, filter);
    let Ok(gameflow_value) = lcu_session.api().get_gameflow_session().await else {
        return fallback;
    };
    let Some(gameflow_session) = parse_gameflow_session_value(&gameflow_value) else {
        return fallback;
    };
    let context = build_context_from_gameflow_session(&gameflow_session, filter);

    if context.queue_id.is_some() || context.map_id.is_some() {
        context
    } else {
        fallback
    }
}

#[derive(Debug)]
struct PlayerFetchCandidate {
    puuid: String,
    champion_id: Option<i64>,
    side: Side,
}

impl From<PlayerSlot> for PlayerFetchCandidate {
    fn from(value: PlayerSlot) -> Self {
        Self {
            puuid: value.puuid,
            champion_id: value.champion_id,
            side: value.side,
        }
    }
}

fn is_bot_slot(slot: &PlayerSlot) -> bool {
    let puuid = slot.puuid.trim();
    if puuid.is_empty() {
        return true;
    }

    let upper = puuid.to_ascii_uppercase();
    upper == "BOT" || upper.starts_with("BOT_")
}

fn split_team_slots(
    our_side: Option<Side>,
    blue_slots: Vec<PlayerSlot>,
    red_slots: Vec<PlayerSlot>,
) -> (Vec<PlayerSlot>, Vec<PlayerSlot>) {
    match our_side {
        Some(Side::Blue) => (blue_slots, red_slots),
        Some(Side::Red) => (red_slots, blue_slots),
        None => (blue_slots, red_slots),
    }
}

fn merge_players_by_side(
    own_players: Vec<OngoingGamePlayerSnapshot>,
    enemy_players: Vec<OngoingGamePlayerSnapshot>,
) -> (
    Vec<OngoingGamePlayerSnapshot>,
    Vec<OngoingGamePlayerSnapshot>,
) {
    let mut blue_players = Vec::new();
    let mut red_players = Vec::new();

    for player in own_players.into_iter().chain(enemy_players) {
        match player.side {
            Side::Blue => blue_players.push(player),
            Side::Red => red_players.push(player),
        }
    }

    (blue_players, red_players)
}

fn collect_players_from_sides(
    blue_players: Vec<OngoingGamePlayerSnapshot>,
    red_players: Vec<OngoingGamePlayerSnapshot>,
) -> Vec<OngoingGamePlayerSnapshot> {
    blue_players.into_iter().chain(red_players).collect()
}

fn build_phase_update_from_ws(
    current_phase: OngoingGamePhase,
    event: &LcuWsEvent,
    focused_puuid: Option<&str>,
    context: OngoingGameContextInfo,
    cached_bot_slots: &[PlayerSlot],
    cached_bot_ids: &[String],
) -> Option<OngoingGamePhaseChanged> {
    match current_phase {
        OngoingGamePhase::ChampSelect => {
            let parsed = parse_champ_select_session_event(event)?;
            match parsed {
                LcuChampSelectSessionEvent::Snapshot(session) => {
                    let (our_side_from_payload, mut blue_players, mut red_players) =
                        build_champ_select_phase_data(&session);
                    normalize_bot_slots(&mut blue_players, cached_bot_ids);
                    normalize_bot_slots(&mut red_players, cached_bot_ids);
                    let our_side = focused_puuid
                        .and_then(|puuid| side_for_puuid(puuid, &blue_players, &red_players))
                        .or(our_side_from_payload);
                    Some(OngoingGamePhaseChanged {
                        phase: OngoingGamePhase::ChampSelect,
                        loading: false,
                        our_side,
                        context,
                        blue_players,
                        red_players,
                    })
                }
                LcuChampSelectSessionEvent::Cleared => None,
            }
        }
        OngoingGamePhase::InGame => {
            let session = parse_gameflow_session_event(event)?;
            let (mut blue_players, mut red_players) = merge_slots_with_cached_bots(
                build_in_game_phase_data(&session),
                cached_bot_slots,
            );
            normalize_bot_slots(&mut blue_players, cached_bot_ids);
            normalize_bot_slots(&mut red_players, cached_bot_ids);
            let our_side =
                focused_puuid.and_then(|puuid| side_for_puuid(puuid, &blue_players, &red_players));
            Some(OngoingGamePhaseChanged {
                phase: OngoingGamePhase::InGame,
                loading: false,
                our_side,
                context,
                blue_players,
                red_players,
            })
        }
        OngoingGamePhase::Idle => None,
    }
}

fn emit_phase_changed(
    event_tx: &broadcast::Sender<OngoingGameManagerEvent>,
    phase: OngoingGamePhase,
    loading: bool,
    our_side: Option<Side>,
    context: OngoingGameContextInfo,
    blue_players: Vec<PlayerSlot>,
    red_players: Vec<PlayerSlot>,
) {
    let _ = event_tx.send(OngoingGameManagerEvent::PhaseChanged(
        OngoingGamePhaseChanged {
            phase,
            loading,
            our_side,
            context,
            blue_players,
            red_players,
        },
    ));
}

fn emit_snapshot_updated(
    event_tx: &broadcast::Sender<OngoingGameManagerEvent>,
    phase: OngoingGamePhase,
    loading: bool,
    our_side: Option<Side>,
    context: OngoingGameContextInfo,
    blue_players: Vec<OngoingGamePlayerSnapshot>,
    red_players: Vec<OngoingGamePlayerSnapshot>,
) {
    let _ = event_tx.send(OngoingGameManagerEvent::SnapshotUpdated(
        OngoingGameSnapshotUpdated {
            phase,
            loading,
            our_side,
            context,
            blue_players,
            red_players,
        },
    ));
}

fn map_gameflow_phase(value: &str) -> OngoingGamePhase {
    match value {
        "ChampSelect" => OngoingGamePhase::ChampSelect,
        "GameStart" | "InProgress" | "InGame" => OngoingGamePhase::InGame,
        _ => OngoingGamePhase::Idle,
    }
}

fn side_from_team_id(team_id: i64) -> Option<Side> {
    match team_id {
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

fn side_for_puuid(
    puuid: &str,
    blue_players: &[PlayerSlot],
    red_players: &[PlayerSlot],
) -> Option<Side> {
    if blue_players.iter().any(|player| player.puuid == puuid) {
        Some(Side::Blue)
    } else if red_players.iter().any(|player| player.puuid == puuid) {
        Some(Side::Red)
    } else {
        None
    }
}

fn champion_id_option(champion_id: i64) -> Option<i64> {
    if champion_id > 0 {
        Some(champion_id)
    } else {
        None
    }
}

fn push_player_slot(
    blue_players: &mut Vec<PlayerSlot>,
    red_players: &mut Vec<PlayerSlot>,
    puuid: String,
    champion_id: Option<i64>,
    side: Side,
) {
    if puuid.is_empty() {
        return;
    }

    let slot = PlayerSlot {
        puuid,
        champion_id,
        side,
    };

    match side {
        Side::Blue => blue_players.push(slot),
        Side::Red => red_players.push(slot),
    }
}

fn build_champ_select_phase_data(
    session: &LcuChampSelectSessionPayload,
) -> (Option<Side>, Vec<PlayerSlot>, Vec<PlayerSlot>) {
    let our_side = if session.is_spectating {
        None
    } else {
        session
            .my_team
            .iter()
            .find(|player| player.cell_id == session.local_player_cell_id)
            .and_then(|player| side_from_team_id(player.team))
            .or_else(|| {
                session
                    .my_team
                    .first()
                    .and_then(|player| side_from_team_id(player.team))
            })
    };

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
    player: &LcuChampSelectPlayer,
    fallback_side: Side,
) {
    let side = side_from_team_id(player.team).unwrap_or(fallback_side);
    push_player_slot(
        blue_players,
        red_players,
        player.puuid.clone(),
        champion_id_option(player.champion_id)
            .or_else(|| champion_id_option(player.champion_pick_intent)),
        side,
    );
}

fn build_in_game_phase_data(
    session: &LcuGameflowSessionPayload,
) -> (Vec<PlayerSlot>, Vec<PlayerSlot>) {
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

fn build_bot_slots_from_parties(participants: &[LcuPartiesBotParticipant]) -> Vec<PlayerSlot> {
    let mut slots = Vec::new();

    for participant in participants {
        let bot_id = participant.bot_id.trim();
        if bot_id.is_empty() {
            continue;
        }
        let Some(side) = side_from_parties_team(&participant.team) else {
            continue;
        };

        slots.push(PlayerSlot {
            puuid: format!("BOT_{bot_id}"),
            champion_id: champion_id_option(participant.champion_id),
            side,
        });
    }

    slots
}

fn side_from_parties_team(team: &str) -> Option<Side> {
    let upper = team.trim().to_ascii_uppercase();
    match upper.as_str() {
        "TEAM1" => Some(Side::Blue),
        "TEAM2" => Some(Side::Red),
        _ => None,
    }
}

fn merge_slots_with_cached_bots(
    gameflow_slots: (Vec<PlayerSlot>, Vec<PlayerSlot>),
    cached_bot_slots: &[PlayerSlot],
) -> (Vec<PlayerSlot>, Vec<PlayerSlot>) {
    let (mut blue_slots, mut red_slots) = gameflow_slots;

    for bot_slot in cached_bot_slots {
        match bot_slot.side {
            Side::Blue => {
                if blue_slots.iter().any(|slot| slot.puuid == bot_slot.puuid) {
                    continue;
                }
                blue_slots.push(bot_slot.clone());
            }
            Side::Red => {
                if red_slots.iter().any(|slot| slot.puuid == bot_slot.puuid) {
                    continue;
                }
                red_slots.push(bot_slot.clone());
            }
        }
    }

    (blue_slots, red_slots)
}

fn normalize_bot_slots(slots: &mut [PlayerSlot], cached_bot_ids: &[String]) {
    for slot in slots {
        let trimmed = slot.puuid.trim();
        if trimmed.is_empty() {
            continue;
        }
        if trimmed.to_ascii_uppercase().starts_with("BOT_") {
            continue;
        }

        if let Some(bot_id) = cached_bot_ids
            .iter()
            .find(|id| id.eq_ignore_ascii_case(trimmed))
        {
            slot.puuid = format!("BOT_{}", bot_id.to_ascii_uppercase());
        }
    }
}

fn push_gameflow_player_slot(
    blue_players: &mut Vec<PlayerSlot>,
    red_players: &mut Vec<PlayerSlot>,
    player: &LcuGameflowTeamPlayer,
    side: Side,
    champion_by_puuid: &HashMap<String, i64>,
) {
    let champion_id = champion_id_option(player.champion_id).or_else(|| {
        champion_by_puuid
            .get(&player.puuid)
            .copied()
            .and_then(champion_id_option)
    });

    push_player_slot(
        blue_players,
        red_players,
        player.puuid.clone(),
        champion_id,
        side,
    );
}
