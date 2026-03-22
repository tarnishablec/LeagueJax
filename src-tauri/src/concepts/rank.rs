use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq)]
#[ts(export, export_to = "rank.ts")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Tier {
    Iron,
    Bronze,
    Silver,
    Gold,
    Platinum,
    Emerald,
    Diamond,
    Master,
    Grandmaster,
    Challenger,
    None,
    #[serde(rename = "")]
    #[ts(rename = "")]
    Empty,
}

#[derive(Debug, Serialize, Deserialize, TS, Clone, Copy, PartialEq, Eq)]
#[ts(export, export_to = "rank.ts")]
pub enum Division {
    I,
    II,
    #[allow(clippy::upper_case_acronyms)]
    III,
    IV,
    #[serde(rename = "NA")]
    NotApplicable,
}

#[derive(Debug, Serialize, Deserialize, Hash, Eq, PartialEq, TS, Clone, Copy)]
#[ts(export, export_to = "rank.ts")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum QueueType {
    #[serde(rename = "RANKED_SOLO_5x5")]
    RankedSolo5x5,
    #[serde(rename = "RANKED_FLEX_SR")]
    RankedFlexSr,
    #[serde(rename = "RANKED_TFT")]
    RankedTft,
    #[serde(rename = "RANKED_TFT_DOUBLE_UP")]
    RankedTftDoubleUp,
    #[serde(rename = "RANKED_TFT_TURBO")]
    RankedTftTurbo,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rank.ts")]
#[serde(rename_all = "camelCase")]
pub struct SeasonInfo {
    pub current_season_end: u64,
    pub current_season_id: i32,
    pub next_season_start: u64,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rank.ts")]
#[serde(rename_all = "camelCase")]
pub struct RankEntry {
    pub climbing_indicator_active: bool,
    pub current_season_wins_for_rewards: i32,
    pub division: Division,
    pub highest_division: Division,
    pub highest_tier: Tier,
    pub is_provisional: bool,
    pub league_points: i32,
    pub losses: i32,
    pub mini_series_progress: String,
    pub previous_season_end_division: Division,
    pub previous_season_end_tier: Tier,
    pub previous_season_highest_division: Division,
    pub previous_season_highest_tier: Tier,
    pub previous_season_wins_for_rewards: i32,
    pub provisional_game_threshold: i32,
    pub provisional_games_remaining: i32,
    pub queue_type: QueueType,
    pub rated_rating: i32,
    pub rated_tier: Tier,
    pub tier: Tier,
    pub wins: i32,
    pub warnings: (),
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rank.ts")]
#[serde(rename_all = "camelCase")]
pub struct RankStats {
    pub current_season_split_points: i32,
    pub earned_regalia_reward_ids: Vec<String>,
    pub highest_current_season_reached_tier_sr: Option<Tier>,
    pub highest_previous_season_end_division: Option<Division>,
    pub highest_previous_season_end_tier: Option<Tier>,

    pub highest_ranked_entry: Option<RankEntry>,
    pub highest_ranked_entry_sr: Option<RankEntry>,

    pub previous_season_split_points: i32,

    pub queue_map: HashMap<QueueType, RankEntry>,
    pub queues: Vec<RankEntry>,

    pub ranked_regalia_level: i32,
    pub seasons: HashMap<QueueType, SeasonInfo>,

    #[ts(type = "Record<string, unknown>")]
    pub splits_progress: HashMap<String, serde_json::Value>,
}
