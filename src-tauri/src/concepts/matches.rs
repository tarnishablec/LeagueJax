use serde::Serialize;
use ts_rs::TS;

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum MatchOutcome {
    Victory,
    Defeat,
    Remake,
    Terminated,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchSummary {
    pub game_id: u64,
    pub champion_id: i64,
    pub win: bool,
    pub outcome: MatchOutcome,
    pub team_id: i64,
    pub kills: i64,
    pub deaths: i64,
    pub assists: i64,
    pub cs: i64,
    pub total_damage_dealt_to_champions: i64,
    pub damage_share: f64,
    pub spell1_id: i64,
    pub spell2_id: i64,
    pub perk_primary_rune_id: i64,
    pub perk_sub_style_id: i64,
    pub items: [i64; 7],
    pub map_id: i64,
    pub game_duration: i64,
    pub game_mode: String,
    pub game_creation: i64,
    pub queue_id: i64,
    pub participants: Vec<MatchSummaryParticipant>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchSummaryParticipant {
    pub puuid: String,
    pub champion_id: i64,
    pub game_name: String,
    pub tag_line: String,
    pub team_id: i64,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Participant {
    pub puuid: String,
    pub champion_id: i64,
    pub summoner_name: String,
    pub game_name: String,
    pub tag_line: String,
    pub team_id: i64,
    pub kills: i64,
    pub deaths: i64,
    pub assists: i64,
    pub total_damage_dealt_to_champions: i64,
    pub total_damage_taken: i64,
    pub gold_earned: i64,
    pub vision_score: i64,
    pub cs: i64,
    pub items: [i64; 7],
    pub spell1_id: i64,
    pub spell2_id: i64,
    pub perk_primary_style: i64,
    pub perk_sub_style: i64,
    pub win: bool,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchDetail {
    pub game_id: u64,
    pub game_duration: i64,
    pub game_mode: String,
    pub game_creation: i64,
    pub queue_id: i64,
    pub participants: Vec<Participant>,
}
