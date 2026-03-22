use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(TS)]
#[ts(export, export_to = "summoner.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummonerInfo {
    pub puuid: String,
    #[serde(default)]
    pub game_name: String,
    #[serde(default)]
    pub tag_line: String,
    pub profile_icon_id: i64,
    #[serde(default)]
    pub summoner_level: i64,
    #[serde(default)]
    pub level: i64,
    #[serde(default)]
    pub privacy: String,
    #[serde(default)]
    pub account_id: i64,
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub internal_name: String,
    #[serde(default)]
    pub exp_points: i64,
    #[serde(default)]
    pub exp_to_next_level: i64,
    #[serde(default)]
    pub level_and_xp_version: i64,
    #[serde(default)]
    pub last_game_date: i64,
    #[serde(default)]
    pub revision_date: i64,
    #[serde(default)]
    pub revision_id: i64,
    #[serde(default)]
    pub name_change_flag: bool,
    #[serde(default)]
    pub unnamed: bool,
}

#[derive(TS)]
#[ts(export, export_to = "summoner.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummonerSearchResult {
    pub puuid: String,
    pub game_name: String,
    pub tag_line: String,
    pub profile_icon_id: i64,
    pub summoner_level: i64,
    pub sgp_server_id: String,
    #[serde(default)]
    pub privacy: String,
}
