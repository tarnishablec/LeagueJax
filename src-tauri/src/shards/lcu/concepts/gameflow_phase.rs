use super::EventType;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameflowPhase {
    pub event_type: EventType,
    /// /lol-gameflow/v1/gameflow-phase
    pub uri: String,
    pub data: Phase,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(rename_all = "PascalCase")]
pub enum Phase {
    #[default]
    None,
    ChampSelect,
    Matchmaking,
    GameStart,
    ReadyCheck,
    InProgress,
    WaitingForStats,
    TerminatedInError,
    Lobby,
    EndOfGame,
    InGame,
    #[serde(other)]
    Unknown,
}
