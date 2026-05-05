use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shards::lcu::concepts::replays::{LcuReplayConfiguration, LcuReplayMetadata};

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub struct ReplayFolder {
    pub path: String,
    pub enabled: bool,
    pub exists: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReplayClientFamily {
    Tencent,
    Riot,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub struct ReplayClient {
    pub pid: u32,
    pub label: String,
    pub family: ReplayClientFamily,
    pub server_id: Option<String>,
    pub game_version: Option<String>,
    pub install_dir: Option<String>,
    pub is_focused: bool,
    pub available: bool,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub struct ReplayLaunchAvailability {
    pub can_launch: bool,
    pub reason: Option<String>,
    pub client_pid: Option<u32>,
    pub client_family: Option<ReplayClientFamily>,
    pub client_server_id: Option<String>,
    pub client_game_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub struct ReplayEntry {
    pub id: String,
    pub path: String,
    pub file_name: String,
    pub platform_id: Option<String>,
    pub family: Option<ReplayClientFamily>,
    pub game_id: Option<u64>,
    pub patch_version: Option<String>,
    pub metadata_error: Option<String>,
    pub game_length_ms: Option<u64>,
    pub last_game_chunk_id: Option<u64>,
    pub last_key_frame_id: Option<u64>,
    pub file_size_bytes: u64,
    pub created_at_ms: Option<i64>,
    pub modified_at_ms: Option<i64>,
    pub launch_availability: ReplayLaunchAvailability,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub struct ReplayLibrarySnapshot {
    pub folders: Vec<ReplayFolder>,
    pub clients: Vec<ReplayClient>,
    pub entries: Vec<ReplayEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub struct ReplayMatchContext {
    pub game_id: u64,
    pub game_version: Option<String>,
    pub game_type: Option<String>,
    pub queue_id: Option<i64>,
    pub game_end: Option<i64>,
    pub platform_id: Option<String>,
    pub sgp_server_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "replay.ts")]
#[serde(rename_all = "camelCase")]
pub struct ReplayMatchState {
    pub metadata: LcuReplayMetadata,
    pub configuration: Option<LcuReplayConfiguration>,
}
