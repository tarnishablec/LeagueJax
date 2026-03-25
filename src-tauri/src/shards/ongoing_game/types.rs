use serde::Serialize;
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

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub struct PlayerSlot {
    pub puuid: String,
    pub champion_id: Option<i64>,
    pub side: Side,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
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
    pub blue_players: Vec<OngoingGamePlayerSnapshot>,
    pub red_players: Vec<OngoingGamePlayerSnapshot>,
}

