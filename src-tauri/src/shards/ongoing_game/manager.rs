use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::broadcast;
use tokio::task::JoinSet;
use tokio_util::sync::CancellationToken;

use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::watcher::LcuWsEvent;
use crate::shards::lcu::ws_event_types::{
    parse_champ_select_session_event, parse_champ_select_session_value,
    parse_gameflow_session_event, parse_gameflow_session_value, LcuChampSelectPlayer,
    LcuChampSelectSessionEvent, LcuChampSelectSessionPayload, LcuGameflowSessionPayload,
    LcuGameflowTeamPlayer,
};
use crate::shards::ongoing_game::types::{
    OngoingGamePhase, OngoingGamePhaseChanged, OngoingGamePlayerSnapshot,
    OngoingGameSnapshotUpdated, PlayerSlot, Side,
};
use crate::shards::sgp::session::SgpSession;

use super::driver::OngoingGameDriver;

const DEFAULT_MATCH_HISTORY_COUNT: u32 = 20;

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
            }),
            cancel_token,
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<OngoingGameManagerEvent> {
        self.event_tx.subscribe()
    }

    pub async fn handle_focus_changed(
        &self,
        lcu_session: Option<Arc<LcuSession>>,
        sgp_session: Option<Arc<SgpSession>>,
    ) {
        {
            let mut state = self.state.lock().await;
            if let Some(token) = state.active_phase_task.take() {
                token.cancel();
            }
            state.driver = None;
            state.lcu_session = None;
            state.sgp_session = None;
            state.focused_puuid = None;
        }

        let Some(lcu) = lcu_session else {
            tracing::debug!("OngoingGame: no focused client, manager cleared");
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

        match lcu.api().get_gameflow_phase().await {
            Ok(phase_str) => {
                let phase = map_gameflow_phase(phase_str.as_str());
                if let Some(new_phase) = driver.force_phase(phase) {
                    self.on_phase_changed(
                        new_phase,
                        lcu.clone(),
                        sgp_session.clone(),
                        focused_puuid.clone(),
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
        )> = None;
        let mut ws_phase_update: Option<OngoingGamePhaseChanged> = None;

        {
            let mut state = self.state.lock().await;
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
                    ));
                }
            } else {
                ws_phase_update = build_phase_update_from_ws(
                    driver.current_phase(),
                    &event,
                    state.focused_puuid.as_deref(),
                );
            }
        }

        if let Some((new_phase, lcu, sgp, focused_puuid)) = transition {
            self.on_phase_changed(new_phase, lcu, sgp, focused_puuid)
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
    ) {
        emit_phase_changed(
            &self.event_tx,
            phase,
            phase != OngoingGamePhase::Idle,
            None,
            Vec::new(),
            Vec::new(),
        );

        let task_token = {
            let mut state = self.state.lock().await;
            if let Some(token) = state.active_phase_task.take() {
                token.cancel();
            }

            if phase == OngoingGamePhase::Idle {
                None
            } else {
                let token = self.cancel_token.child_token();
                state.active_phase_task = Some(token.clone());
                Some(token)
            }
        };

        let Some(task_token) = task_token else {
            return;
        };

        let event_tx = self.event_tx.clone();

        tokio::spawn(async move {
            tokio::select! {
                _ = task_token.cancelled() => {}
                _ = fetch_phase_data(phase, lcu_session, sgp_session, focused_puuid, event_tx) => {}
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
    event_tx: broadcast::Sender<OngoingGameManagerEvent>,
) {
    match phase {
        OngoingGamePhase::ChampSelect => {
            fetch_champ_select_phase_data(lcu_session, sgp_session, focused_puuid, event_tx).await;
        }
        OngoingGamePhase::InGame => {
            fetch_in_game_phase_data(lcu_session, sgp_session, focused_puuid, event_tx).await;
        }
        OngoingGamePhase::Idle => {}
    }
}

async fn fetch_champ_select_phase_data(
    lcu_session: Arc<LcuSession>,
    sgp_session: Option<Arc<SgpSession>>,
    focused_puuid: Option<String>,
    event_tx: broadcast::Sender<OngoingGameManagerEvent>,
) {
    match lcu_session.api().get_champ_select_session().await {
        Ok(session_value) => {
            let Some(session) = parse_champ_select_session_value(&session_value) else {
                tracing::warn!("Failed to parse champ select session payload");
                emit_phase_changed(
                    &event_tx,
                    OngoingGamePhase::ChampSelect,
                    false,
                    None,
                    Vec::new(),
                    Vec::new(),
                );
                return;
            };

            let (our_side_from_payload, blue_slots, red_slots) =
                build_champ_select_phase_data(&session);
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
                blue_slots.clone(),
                red_slots.clone(),
            );

            let (own_slots, _) = split_team_slots(our_side, blue_slots, red_slots);
            let own_players = fetch_team_players(lcu_session, sgp_session, own_slots).await;
            let (blue_players, red_players) = merge_players_by_side(own_players, Vec::new());

            emit_snapshot_updated(
                &event_tx,
                OngoingGamePhase::ChampSelect,
                false,
                our_side,
                blue_players,
                red_players,
            );

            emit_phase_changed(
                &event_tx,
                OngoingGamePhase::ChampSelect,
                false,
                our_side,
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
    event_tx: broadcast::Sender<OngoingGameManagerEvent>,
) {
    match lcu_session.api().get_gameflow_session().await {
        Ok(session_value) => {
            let Some(session) = parse_gameflow_session_value(&session_value) else {
                tracing::warn!("Failed to parse gameflow session payload");
                emit_phase_changed(
                    &event_tx,
                    OngoingGamePhase::InGame,
                    false,
                    None,
                    Vec::new(),
                    Vec::new(),
                );
                return;
            };

            let (blue_slots, red_slots) = build_in_game_phase_data(&session);
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
                blue_slots.clone(),
                red_slots.clone(),
            );

            let (own_slots, enemy_slots) = split_team_slots(our_side, blue_slots, red_slots);

            let own_players =
                fetch_team_players(lcu_session.clone(), sgp_session.clone(), own_slots).await;
            let (blue_players, red_players) = merge_players_by_side(own_players, Vec::new());
            emit_snapshot_updated(
                &event_tx,
                OngoingGamePhase::InGame,
                true,
                our_side,
                blue_players.clone(),
                red_players.clone(),
            );

            let enemy_players = fetch_team_players(lcu_session, sgp_session, enemy_slots).await;
            let (blue_players, red_players) = merge_players_by_side(
                collect_players_from_sides(blue_players, red_players),
                enemy_players,
            );

            emit_snapshot_updated(
                &event_tx,
                OngoingGamePhase::InGame,
                false,
                our_side,
                blue_players,
                red_players,
            );

            emit_phase_changed(
                &event_tx,
                OngoingGamePhase::InGame,
                false,
                our_side,
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
        joins.spawn(async move {
            let player = fetch_player_snapshot(lcu, sgp, candidate).await;
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

async fn fetch_player_snapshot(
    lcu_session: Arc<LcuSession>,
    sgp_session: Option<Arc<SgpSession>>,
    candidate: PlayerFetchCandidate,
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
            sgp.api()
                .get_match_summaries(&candidate.puuid, 0, DEFAULT_MATCH_HISTORY_COUNT, None, None)
                .await
                .ok()
        } else {
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
) -> Option<OngoingGamePhaseChanged> {
    match current_phase {
        OngoingGamePhase::ChampSelect => {
            let parsed = parse_champ_select_session_event(event)?;
            match parsed {
                LcuChampSelectSessionEvent::Snapshot(session) => {
                    let (our_side_from_payload, blue_players, red_players) =
                        build_champ_select_phase_data(&session);
                    let our_side = focused_puuid
                        .and_then(|puuid| side_for_puuid(puuid, &blue_players, &red_players))
                        .or(our_side_from_payload);
                    Some(OngoingGamePhaseChanged {
                        phase: OngoingGamePhase::ChampSelect,
                        loading: false,
                        our_side,
                        blue_players,
                        red_players,
                    })
                }
                LcuChampSelectSessionEvent::Cleared => None,
            }
        }
        OngoingGamePhase::InGame => {
            let session = parse_gameflow_session_event(event)?;
            let (blue_players, red_players) = build_in_game_phase_data(&session);
            let our_side =
                focused_puuid.and_then(|puuid| side_for_puuid(puuid, &blue_players, &red_players));
            Some(OngoingGamePhaseChanged {
                phase: OngoingGamePhase::InGame,
                loading: false,
                our_side,
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
    blue_players: Vec<PlayerSlot>,
    red_players: Vec<PlayerSlot>,
) {
    let _ = event_tx.send(OngoingGameManagerEvent::PhaseChanged(
        OngoingGamePhaseChanged {
            phase,
            loading,
            our_side,
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
    blue_players: Vec<OngoingGamePlayerSnapshot>,
    red_players: Vec<OngoingGamePlayerSnapshot>,
) {
    let _ = event_tx.send(OngoingGameManagerEvent::SnapshotUpdated(
        OngoingGameSnapshotUpdated {
            phase,
            loading,
            our_side,
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
        champion_id_option(player.champion_id),
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
