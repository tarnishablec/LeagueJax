use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use ts_rs::TS;

#[derive(TS, Debug, Clone, Default, Serialize, Deserialize)]
#[ts(export, export_to = "maps.ts")]
#[serde(rename_all = "camelCase")]
pub struct LcuMapSpellRule {
    #[serde(default)]
    pub spells: Vec<i64>,
}

#[derive(TS, Debug, Clone, Default, Serialize, Deserialize)]
#[ts(export, export_to = "maps.ts")]
#[serde(rename_all = "camelCase")]
pub struct LcuMapProperties {
    #[serde(default)]
    pub suppress_runes_masteries_perks: bool,
}

#[derive(TS, Debug, Clone, Default, Serialize, Deserialize)]
#[ts(export, export_to = "maps.ts")]
#[serde(rename_all = "camelCase")]
pub struct LcuMapTutorialCard {
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub footer: String,
    #[serde(default)]
    pub header: String,
    #[serde(default)]
    pub image_path: String,
}

#[derive(TS, Debug, Clone, Default, Serialize, Deserialize)]
#[ts(export, export_to = "maps.ts")]
#[serde(rename_all = "camelCase")]
pub struct LcuMap {
    #[serde(default)]
    pub assets: HashMap<String, String>,
    #[serde(default)]
    #[ts(type = "Record<string, unknown>")]
    pub categorized_content_bundles: Value,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub game_mode: String,
    #[serde(default)]
    pub game_mode_description: String,
    #[serde(default)]
    pub game_mode_name: String,
    #[serde(default)]
    pub game_mode_short_name: String,
    #[serde(default)]
    pub game_mutator: String,
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub is_rgm: bool,
    #[serde(default)]
    pub loc_strings: HashMap<String, String>,
    #[serde(default)]
    pub map_string_id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub per_position_disallowed_summoner_spells: HashMap<String, LcuMapSpellRule>,
    #[serde(default)]
    pub per_position_required_summoner_spells: HashMap<String, LcuMapSpellRule>,
    #[serde(default)]
    pub platform_id: String,
    #[serde(default)]
    pub platform_name: String,
    #[serde(default)]
    pub properties: LcuMapProperties,
    #[serde(default)]
    pub set_modal_button_bottom: i64,
    #[serde(default)]
    pub set_modal_button_left: i64,
    #[serde(default)]
    pub tft_set_override: String,
    #[serde(default)]
    pub tutorial_cards: Vec<LcuMapTutorialCard>,
}
