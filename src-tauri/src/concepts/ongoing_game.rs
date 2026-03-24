use serde::Serialize;
use ts_rs::TS;

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
