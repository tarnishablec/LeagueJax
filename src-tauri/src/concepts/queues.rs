use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(TS, Debug, Clone, Default, Serialize, Deserialize)]
#[ts(export, export_to = "queues.ts")]
#[serde(rename_all = "camelCase")]
pub struct LcuQueue {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub short_name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub detailed_description: String,
    #[serde(default)]
    pub game_select_mode_group: String,
    #[serde(default)]
    pub game_select_category: String,
    #[serde(default)]
    pub game_select_priority: i64,
}
