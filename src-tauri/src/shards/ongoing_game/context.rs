use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use maokai_gears::ops::task::TaskHandle;
use tokio::sync::{broadcast, mpsc, Semaphore};

use crate::shards::lcu::concepts::champ_select_session::{ChampSelectSessionData, TeamMember};
use crate::shards::lcu::concepts::gameflow_session::GameflowSessionData;
use crate::shards::lcu::concepts::matchmaking_ready_check::MatchmakingReadyCheckData;
use crate::shards::lcu::concepts::matchmaking_search::{
    MatchmakingSearchData, MatchmakingSearchState,
};
use crate::shards::lcu::concepts::teambuilder_tbd_game::TeambuilderTbdGamePayload;
use crate::shards::lcu::LcuShard;
use crate::shards::sgp::SgpShard;

use super::manager::{MatchHistoryModeSetting, OngoingGameSettings};
use super::types::{
    OngoingGameEvent, OngoingGameInput, OngoingGameMatchHistoryState, OngoingGamePhase,
    OngoingGameSummonerState, OngoingGameUpdated,
};

pub(crate) const MAX_MATCH_HISTORY_FETCH_CONCURRENCY: usize = 5;

fn idle_snapshot() -> OngoingGameUpdated {
    OngoingGameUpdated {
        phase: OngoingGamePhase::Idle,
        lifecycle_game_id: None,
        match_history_tag: None,
        effective_queue_id: None,
        effective_mode_tag: None,
        match_histories_pending: false,
        summoner_states: Vec::new(),
        history_states: Vec::new(),
        gameflow_session: None,
        matchmaking_search: None,
        ready_check: None,
        champ_select_session: None,
        team_members: Vec::new(),
    }
}

pub(crate) struct Channels {
    pub(crate) ongoing_tx: broadcast::Sender<OngoingGameEvent>,
    snapshot: RwLock<OngoingGameUpdated>,
}

impl Channels {
    pub(crate) fn new() -> Self {
        let (ongoing_tx, _) = broadcast::channel(64);
        Self {
            ongoing_tx,
            snapshot: RwLock::new(idle_snapshot()),
        }
    }

    pub(crate) fn broadcast(&self, event: OngoingGameEvent) {
        if let OngoingGameEvent::Updated(payload) = &event {
            if let Ok(mut snapshot) = self.snapshot.write() {
                *snapshot = payload.clone();
            }
        }
        let _ = self.ongoing_tx.send(event);
    }

    pub(crate) fn subscribe(&self) -> broadcast::Receiver<OngoingGameEvent> {
        self.ongoing_tx.subscribe()
    }

    pub(crate) fn snapshot(&self) -> OngoingGameUpdated {
        self.snapshot
            .read()
            .map(|snapshot| snapshot.clone())
            .unwrap_or_else(|_| idle_snapshot())
    }
}

#[derive(Clone)]
pub struct OngoingGameCtx {
    // Lifecycle
    pub lifecycle_game_id: Option<u64>,

    // Roster
    pub team_members: Vec<TeamMember>,
    pub gameflow_session: Option<GameflowSessionData>,
    pub matchmaking_search: Option<MatchmakingSearchData>,
    pub ready_check: Option<MatchmakingReadyCheckData>,
    pub champ_select_session: Option<ChampSelectSessionData>,
    pub teambuilder_payload: Option<TeambuilderTbdGamePayload>,
    pub effective_queue_id: Option<u64>,

    // Match-history filter
    pub match_history_mode: MatchHistoryModeSetting,

    // Per-player state
    pub summoner_states: HashMap<String, OngoingGameSummonerState>,
    pub history_states: HashMap<String, OngoingGameMatchHistoryState>,

    // Task tracking
    pub summoner_tasks: HashMap<String, TaskHandle>,
    pub history_tasks: HashMap<String, TaskHandle>,
    pub history_fetch_semaphore: Arc<Semaphore>,

    // Services
    pub lcu_shard: Arc<LcuShard>,
    pub sgp_shard: Arc<SgpShard>,
    pub settings: OngoingGameSettings,

    // Infrastructure
    pub channels: Arc<Channels>,
    pub input_tx: mpsc::UnboundedSender<OngoingGameInput>,
    pub current_focus_pid: Option<u32>,
}

impl OngoingGameCtx {
    pub fn new(
        lcu_shard: Arc<LcuShard>,
        sgp_shard: Arc<SgpShard>,
        settings: OngoingGameSettings,
        input_tx: mpsc::UnboundedSender<OngoingGameInput>,
    ) -> Self {
        Self {
            lifecycle_game_id: None,
            team_members: Vec::new(),
            gameflow_session: None,
            matchmaking_search: None,
            ready_check: None,
            champ_select_session: None,
            teambuilder_payload: None,
            effective_queue_id: None,
            match_history_mode: MatchHistoryModeSetting::CurrentMode,
            summoner_states: HashMap::new(),
            history_states: HashMap::new(),
            summoner_tasks: HashMap::new(),
            history_tasks: HashMap::new(),
            history_fetch_semaphore: Arc::new(Semaphore::new(MAX_MATCH_HISTORY_FETCH_CONCURRENCY)),
            lcu_shard,
            sgp_shard,
            settings,
            channels: Arc::new(Channels::new()),
            input_tx,
            current_focus_pid: None,
        }
    }

    pub fn effective_ready_check(&self) -> Option<&MatchmakingReadyCheckData> {
        self.ready_check.as_ref().or_else(|| {
            self.matchmaking_search
                .as_ref()
                .map(|search| &search.ready_check)
        })
    }

    pub fn is_matchmaking_search_active(&self) -> bool {
        self.matchmaking_search.as_ref().is_some_and(|search| {
            search.is_currently_in_queue
                || matches!(
                    search.search_state,
                    MatchmakingSearchState::Searching | MatchmakingSearchState::Found
                )
        })
    }
}
