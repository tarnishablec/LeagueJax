use std::collections::HashMap;
use std::sync::Arc;

use maokai_gears::ops::task::TaskHandle;
use tokio::sync::{broadcast, mpsc};

use crate::shards::lcu::concepts::champ_select_session::{ChampSelectSessionData, TeamMember};
use crate::shards::lcu::concepts::gameflow_session::GameflowSessionData;
use crate::shards::lcu::concepts::teambuilder_tbd_game::TeambuilderTbdGamePayload;
use crate::shards::lcu::LcuShard;
use crate::shards::sgp::SgpShard;

use super::manager::{MatchHistoryModeSetting, OngoingGameSettings};
use super::types::{OngoingGameEvent, OngoingGameInput, OngoingGameMatchHistoryState, OngoingGameSummonerState};

// ── Broadcast channels ──────────────────────────────────────────────────

pub(crate) struct Channels {
    pub(crate) ongoing_tx: broadcast::Sender<OngoingGameEvent>,
}

impl Channels {
    pub(crate) fn new() -> Self {
        let (ongoing_tx, _) = broadcast::channel(64);
        Self { ongoing_tx }
    }

    pub(crate) fn broadcast(&self, event: OngoingGameEvent) {
        let _ = self.ongoing_tx.send(event);
    }

    pub(crate) fn subscribe(&self) -> broadcast::Receiver<OngoingGameEvent> {
        self.ongoing_tx.subscribe()
    }
}

// ── Machine context ─────────────────────────────────────────────────────

#[derive(Clone)]
pub struct OngoingGameCtx {
    // Lifecycle
    pub lifecycle_game_id: Option<u64>,

    // Roster
    pub team_members: Vec<TeamMember>,
    pub gameflow_session: Option<GameflowSessionData>,
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

    // Services
    pub lcu_shard: Arc<LcuShard>,
    pub sgp_shard: Arc<SgpShard>,
    pub settings: OngoingGameSettings,

    // Infrastructure
    pub channels: Arc<Channels>,
    pub input_tx: mpsc::UnboundedSender<OngoingGameInput>,
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
            champ_select_session: None,
            teambuilder_payload: None,
            effective_queue_id: None,
            match_history_mode: MatchHistoryModeSetting::All,
            summoner_states: HashMap::new(),
            history_states: HashMap::new(),
            summoner_tasks: HashMap::new(),
            history_tasks: HashMap::new(),
            lcu_shard,
            sgp_shard,
            settings,
            channels: Arc::new(Channels::new()),
            input_tx,
        }
    }
}
