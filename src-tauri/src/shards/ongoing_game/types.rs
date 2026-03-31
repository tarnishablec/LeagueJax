use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shards::lcu::events::champ_select_session::{ChampSelectSessionData, TeamMember};
use crate::shards::lcu::events::gameflow_session::GameflowSessionData;
use crate::shards::lcu::summoner::SummonerInfo;
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

// ---------------------------------------------------------------------------
// Broadcast payloads
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameUpdated {
    pub phase: OngoingGamePhase,
    /// Current SGP tag filter (e.g. "q_420"), None = all modes.
    pub match_history_tag: Option<String>,
    pub gameflow_session: Option<GameflowSessionData>,
    pub champ_select_session: Option<ChampSelectSessionData>,
    pub team_members: Vec<TeamMember>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameSummonersUpdated {
    pub phase: OngoingGamePhase,
    pub summoners: Vec<SummonerInfo>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameMatchHistoriesUpdated {
    pub phase: OngoingGamePhase,
    pub match_histories: HashMap<String, Vec<RawMatchSummaryGame>>,
}

// ---------------------------------------------------------------------------
// Unified broadcast event (single channel)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", content = "data")]
pub enum OngoingGameEvent {
    Updated(OngoingGameUpdated),
    SummonersUpdated(OngoingGameSummonersUpdated),
    MatchHistoriesUpdated(OngoingGameMatchHistoriesUpdated),
}
