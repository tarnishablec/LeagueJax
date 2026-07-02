use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(TS)]
#[ts(export, export_to = "cherry.ts")]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct CherryAugment {
    #[serde(default)]
    pub id: i64,
    #[serde(rename = "nameTRA")]
    #[serde(default)]
    pub name_tra: String,
    #[serde(default)]
    pub augment_small_icon_path: String,
    #[serde(default)]
    pub rarity: String,
}
