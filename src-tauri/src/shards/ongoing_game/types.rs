use serde::{Deserialize, Serialize};
use serde_json::Value;
use ts_rs::TS;

use crate::shards::lcu::rank::RankStats;
use crate::shards::lcu::summoner::SummonerInfo;
use crate::shards::sgp::matches::RawMatchSummariesResponse;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub enum OngoingGamePhase {
    Idle,
    ChampSelect,
    InGame,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub enum Side {
    Blue,
    Red,
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

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub struct PlayerSlot {
    pub puuid: String,
    pub champion_id: Option<i64>,
    pub side: Side,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[allow(dead_code)]
pub struct PremadeGroup {
    pub group_id: String,
    pub members: Vec<String>,
    pub side: Side,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub struct OngoingGamePhaseChanged {
    pub phase: OngoingGamePhase,
    pub loading: bool,
    pub our_side: Option<Side>,
    pub context: OngoingGameContextInfo,
    pub blue_players: Vec<PlayerSlot>,
    pub red_players: Vec<PlayerSlot>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub struct OngoingGamePlayerSnapshot {
    pub puuid: String,
    pub side: Side,
    pub champion_id: Option<i64>,
    pub summoner: SummonerInfo,
    pub ranked: Option<RankStats>,
    pub match_history: Option<RawMatchSummariesResponse>,
    #[ts(type = "Record<string, unknown> | null")]
    pub champion_mastery: Option<Value>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub struct OngoingGameSnapshotUpdated {
    pub phase: OngoingGamePhase,
    pub loading: bool,
    pub our_side: Option<Side>,
    pub context: OngoingGameContextInfo,
    pub blue_players: Vec<OngoingGamePlayerSnapshot>,
    pub red_players: Vec<OngoingGamePlayerSnapshot>,
}

