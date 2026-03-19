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

#[derive(TS)]
#[ts(export, export_to = "summoner.ts")]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RankedQueueStats {
    pub queue_type: String,
    pub tier: String,
    pub division: String,
    pub league_points: i64,
    pub wins: i64,
    pub losses: i64,
}

#[derive(TS)]
#[ts(export, export_to = "summoner.ts")]
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RankedSummary {
    pub solo: Option<RankedQueueStats>,
    pub flex: Option<RankedQueueStats>,
}
