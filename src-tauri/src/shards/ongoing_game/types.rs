use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shards::lcu::events::champ_select_session::{ChampSelectSessionData, TeamMember};
use crate::shards::lcu::events::gameflow_session::GameflowSessionData;
use crate::shards::lcu::summoner::SummonerInfo;
use crate::shards::sgp::matches::RawMatchSummaryGame;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub enum OngoingGamePhase {
    Idle,
    ChampSelect,
    InGame,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS, Default)]
#[ts(export, export_to = "ongoing_game.ts")]
pub enum OngoingGameMatchHistoryFilter {
    #[default]
    CurrentMode,
    All,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Blue,
    Red,
}

#[derive(Debug, Clone)]
pub struct PlayerSlot {
    pub puuid: String,
    pub champion_id: Option<i64>,
    pub is_bot: bool,
    pub position_assigned: Option<String>,
    pub position_primary: Option<String>,
    pub position_secondary: Option<String>,
    pub side: Side,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub struct OngoingGameUpdated {
    pub phase: OngoingGamePhase,
    pub match_history_filter: OngoingGameMatchHistoryFilter,
    pub gameflow_session: Option<GameflowSessionData>,
    pub champ_select_session: Option<ChampSelectSessionData>,
    pub team_members: Vec<TeamMember>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub struct OngoingGameSummonersUpdated {
    pub phase: OngoingGamePhase,
    pub summoners: Vec<SummonerInfo>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub struct OngoingGameMatchHistoriesUpdated {
    pub phase: OngoingGamePhase,
    pub match_histories: HashMap<String, Vec<RawMatchSummaryGame>>,
}
