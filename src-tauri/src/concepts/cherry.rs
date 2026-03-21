use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(TS)]
#[ts(export, export_to = "cherry.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CherryAugment {
    pub id: i64,
    #[serde(rename = "nameTRA")]
    pub name_tra: String,
    pub augment_small_icon_path: String,
    pub rarity: String,
}
