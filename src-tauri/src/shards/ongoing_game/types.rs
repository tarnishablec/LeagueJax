use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::concepts::champ_select_session::{ChampSelectSessionData, TeamMember};
use crate::shards::lcu::concepts::gameflow_session::GameflowSessionData;
use crate::shards::lcu::concepts::matchmaking_ready_check::MatchmakingReadyCheckData;
use crate::shards::lcu::concepts::matchmaking_search::MatchmakingSearchData;
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::lcu::concepts::teambuilder_tbd_game::TeambuilderTbdGamePayload;
use crate::shards::lcu::manager::FocusChange;
use crate::shards::sgp::matches::RawMatchSummaryGame;

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub enum OngoingGamePhase {
    #[default]
    Idle,
    Matchmaking,
    ReadyCheck,
    ChampSelect,
    InGame,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub enum OngoingGamePlayerLoadStatus {
    #[default]
    Idle,
    Loading,
    Ready,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameSummonerState {
    pub game_id: Option<u64>,
    pub puuid: String,
    pub team_id: u64,
    pub status: OngoingGamePlayerLoadStatus,
    pub summoner: Option<SummonerInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameMatchHistoryState {
    pub game_id: Option<u64>,
    pub puuid: String,
    pub team_id: u64,
    pub status: OngoingGamePlayerLoadStatus,
    pub games: Option<Vec<RawMatchSummaryGame>>,
}

// ---------------------------------------------------------------------------
// Broadcast payloads
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameUpdated {
    pub phase: OngoingGamePhase,
    pub lifecycle_game_id: Option<u64>,
    /// User-selected match-history mode tag.
    /// - "__current_mode__": follow current queue mode
    /// - `q_xxx`: fixed queue mode
    /// - None: all modes
    pub match_history_tag: Option<String>,
    /// Queue id resolved from the current game context.
    pub effective_queue_id: Option<u64>,
    /// Effective SGP mode tag after resolving `match_history_tag` against current context.
    pub effective_mode_tag: Option<String>,
    pub match_histories_pending: bool,
    pub summoner_states: Vec<OngoingGameSummonerState>,
    pub history_states: Vec<OngoingGameMatchHistoryState>,
    pub gameflow_session: Option<GameflowSessionData>,
    pub matchmaking_search: Option<MatchmakingSearchData>,
    pub ready_check: Option<MatchmakingReadyCheckData>,
    pub champ_select_session: Option<ChampSelectSessionData>,
    pub team_members: Vec<TeamMember>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameSummonersUpdated {
    pub phase: OngoingGamePhase,
    pub state: OngoingGameSummonerState,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameMatchHistoriesUpdated {
    pub phase: OngoingGamePhase,
    pub state: OngoingGameMatchHistoryState,
}

// ---------------------------------------------------------------------------
// Unified broadcast event (single channel)
// ---------------------------------------------------------------------------

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", content = "data")]
pub enum OngoingGameEvent {
    Updated(OngoingGameUpdated),
    SummonersUpdated(OngoingGameSummonersUpdated),
    MatchHistoriesUpdated(OngoingGameMatchHistoriesUpdated),
}

// ---------------------------------------------------------------------------
// Machine input events
// ---------------------------------------------------------------------------

use super::manager::MatchHistoryModeSetting;

#[derive(Debug)]
pub enum OngoingGameInput {
    // LCU Manager
    FocusChanged(FocusChange),

    // LCU WebSocket
    GameflowSessionUpdated(Box<GameflowSessionData>),
    MatchmakingSearchUpdated(Box<MatchmakingSearchData>),
    MatchmakingSearchDeleted,
    ReadyCheckUpdated(Box<MatchmakingReadyCheckData>),
    ReadyCheckDeleted,
    ChampSelectSessionUpdated(Box<ChampSelectSessionData>),
    TeambuilderTbdGameUpdated(Box<TeambuilderTbdGamePayload>),

    // Commands
    Refresh,
    RefreshMatchHistories,
    SetMatchHistoryMode(MatchHistoryModeSetting),

    // Task Results
    Seeded(Box<OngoingSessionSeed>),
    /// Summoner data loaded from LCU. `game_id` is the `ctx.lifecycle_game_id`
    /// captured when the task was spawned; the handler drops the result if
    /// the lifecycle has moved on, which prevents stale late-firing tasks from
    /// writing back after a game transition or an explicit refresh.
    SummonerLoaded {
        puuid: String,
        info: Option<Box<SummonerInfo>>,
        game_id: Option<u64>,
    },
    /// Match history loaded from SGP. See `SummonerLoaded` for `game_id` semantics.
    MatchHistoryLoaded {
        puuid: String,
        games: Option<Vec<RawMatchSummaryGame>>,
        game_id: Option<u64>,
    },
}
