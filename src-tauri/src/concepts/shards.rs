use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "shards.ts")]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ShardStatusDto {
    Running,
    Failed { error: String },
    Skipped,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "shards.ts")]
#[serde(rename_all = "camelCase")]
pub struct ShardInfoDto {
    pub id: String,
    pub label: String,
    pub status: ShardStatusDto,
    pub dependencies: Vec<String>,
    pub setup_duration_ms: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "shards.ts")]
#[serde(rename_all = "camelCase")]
pub struct ShardsSnapshotDto {
    pub shards: Vec<ShardInfoDto>,
}
