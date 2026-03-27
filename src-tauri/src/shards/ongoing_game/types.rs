use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shards::lcu::events::champ_select_session::TeamMember;
use crate::shards::lcu::events::gameflow_session::GameflowSessionData;

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

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub struct OngoingGameContextInfo {
    pub queue_id: Option<i64>,
    pub queue_name: Option<String>,
    pub queue_short_name: Option<String>,
    pub map_id: Option<i64>,
    pub map_name: Option<String>,
    pub game_mode: Option<String>,
    pub game_mode_name: Option<String>,
    pub game_mode_short_name: Option<String>,
    pub match_history_filter: OngoingGameMatchHistoryFilter,
    pub match_history_tag: Option<String>,
}

impl Default for OngoingGameContextInfo {
    fn default() -> Self {
        Self {
            queue_id: None,
            queue_name: None,
            queue_short_name: None,
            map_id: None,
            map_name: None,
            game_mode: None,
            game_mode_name: None,
            game_mode_short_name: None,
            match_history_filter: OngoingGameMatchHistoryFilter::CurrentMode,
            match_history_tag: None,
        }
    }
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
    pub loading: bool,
    pub context: OngoingGameContextInfo,
    pub gameflow_session: Option<GameflowSessionData>,
    pub team_members: Vec<TeamMember>,
}
