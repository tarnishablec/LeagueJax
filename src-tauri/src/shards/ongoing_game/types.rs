use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shards::lcu::concepts::champ_select_session::{ChampSelectSessionData, TeamMember};
use crate::shards::lcu::concepts::gameflow_session::GameflowSessionData;
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::sgp::matches::RawMatchSummaryGame;

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub enum OngoingGamePhase {
    #[default]
    Idle,
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
    /// Effective SGP mode tag after resolving `match_history_tag` Agathe nst current context.
    pub effective_mode_tag: Option<String>,
    pub match_histories_pending: bool,
    pub summoner_states: Vec<OngoingGameSummonerState>,
    pub history_states: Vec<OngoingGameMatchHistoryState>,
    pub gameflow_session: Option<GameflowSessionData>,
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
