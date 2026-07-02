use super::EventType;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct MatchmakingReadyCheck {
    pub event_type: EventType,
    /// /lol-matchmaking/v1/ready-check
    pub uri: String,
    pub data: Option<MatchmakingReadyCheckData>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct MatchmakingReadyCheckData {
    pub decliner_ids: Vec<u64>,
    pub dodge_warning: String,
    pub player_response: ReadyCheckPlayerResponse,
    pub state: ReadyCheckState,
    pub suppress_ux: bool,
    pub timer: f64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, TS, PartialEq, Eq)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(rename_all = "PascalCase")]
pub enum ReadyCheckPlayerResponse {
    #[default]
    None,
    Accepted,
    Declined,
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, TS, PartialEq, Eq)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(rename_all = "PascalCase")]
pub enum ReadyCheckState {
    #[default]
    Invalid,
    InProgress,
    EveryoneReady,
    #[serde(other)]
    Unknown,
}
