use serde::Serialize;
use ts_rs::TS;

#[derive(TS)]
#[ts(export, export_to = "summoner.ts")]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SummonerInfo {
    pub puuid: String,
    pub game_name: String,
    pub tag_line: String,
    pub profile_icon_id: i64,
    pub summoner_level: i64,
}
