use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub enum LcuReplayDownloadState {
    #[default]
    Checking,
    Found,
    Download,
    Downloading,
    Watch,
    Incompatible,
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub struct LcuReplayMetadata {
    #[serde(default)]
    pub download_progress: f64,
    #[serde(default)]
    pub game_id: u64,
    #[serde(default)]
    pub state: LcuReplayDownloadState,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub struct LcuReplayConfiguration {
    #[serde(default)]
    pub game_version: String,
    #[serde(default)]
    pub is_in_tournament: bool,
    #[serde(default)]
    pub is_logged_in: bool,
    #[serde(default)]
    pub is_patching: bool,
    #[serde(default)]
    pub is_playing_game: bool,
    #[serde(default)]
    pub is_playing_replay: bool,
    #[serde(default)]
    pub is_replays_enabled: bool,
    #[serde(default)]
    pub is_replays_for_end_of_game_enabled: bool,
    #[serde(default)]
    pub is_replays_for_match_history_enabled: bool,
    #[serde(default)]
    pub min_server_version: String,
    #[serde(default)]
    pub minutes_until_replay_considered_lost: i64,
}
