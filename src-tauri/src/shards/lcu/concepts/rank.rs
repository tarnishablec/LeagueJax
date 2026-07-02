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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rank.ts")]
#[serde(rename_all = "camelCase")]
pub struct SeasonInfo {
    pub current_season_end: u64,
    pub current_season_id: i32,
    pub next_season_start: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
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

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rank.ts")]
#[serde(rename_all = "camelCase")]
pub struct AchievedTier {
    pub division: i32,
    pub queue_type: QueueType,
    pub tier: Tier,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "rank.ts")]
#[serde(rename_all = "camelCase")]
pub struct RankedTierSummary {
    pub achieved_tiers: Vec<AchievedTier>,
    pub summoner_id: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MmrReferenceAnchor {
    pub tier: Tier,
    pub display_name: &'static str,
    pub min_mmr_inclusive: i32,
    pub max_mmr_inclusive: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MmrReferenceScale {
    pub scale_id: &'static str,
    pub kind: &'static str,
    pub season: &'static str,
    pub source_name: &'static str,
    pub source_url: &'static str,
    pub source_accessed_at: &'static str,
    pub not_official: bool,
    pub confidence: &'static str,
    pub points_per_division_estimate: i32,
    pub notes: Vec<&'static str>,
    pub anchors: Vec<MmrReferenceAnchor>,
}

// This scale is an internal consensus anchor for agent/product analysis, not a Riot-owned source of truth.
pub fn mmr_reference_scale() -> MmrReferenceScale {
    MmrReferenceScale {
        scale_id: "leaguejax-season-2026-noobhours-v1",
        kind: "community_heuristic",
        season: "2026",
        source_name: "NoobHours LoL MMR Checker",
        source_url: "https://noobhours.com/lol-mmr-checker",
        source_accessed_at: "2026-05-25",
        not_official: true,
        confidence: "heuristic",
        points_per_division_estimate: 125,
        notes: vec![
            "This is a LeagueJax consensus reference scale, not Riot's hidden MMR.",
            "Use it as an internal coordinate system for rough rank-equivalent analysis.",
            "Master, Grandmaster, and Challenger share the same base range; LP and ladder position determine the visible apex tier.",
        ],
        anchors: vec![
            MmrReferenceAnchor {
                tier: Tier::Iron,
                display_name: "Iron",
                min_mmr_inclusive: 0,
                max_mmr_inclusive: Some(499),
            },
            MmrReferenceAnchor {
                tier: Tier::Bronze,
                display_name: "Bronze",
                min_mmr_inclusive: 500,
                max_mmr_inclusive: Some(999),
            },
            MmrReferenceAnchor {
                tier: Tier::Silver,
                display_name: "Silver",
                min_mmr_inclusive: 1000,
                max_mmr_inclusive: Some(1499),
            },
            MmrReferenceAnchor {
                tier: Tier::Gold,
                display_name: "Gold",
                min_mmr_inclusive: 1500,
                max_mmr_inclusive: Some(1999),
            },
            MmrReferenceAnchor {
                tier: Tier::Platinum,
                display_name: "Platinum",
                min_mmr_inclusive: 2000,
                max_mmr_inclusive: Some(2499),
            },
            MmrReferenceAnchor {
                tier: Tier::Emerald,
                display_name: "Emerald",
                min_mmr_inclusive: 2500,
                max_mmr_inclusive: Some(2999),
            },
            MmrReferenceAnchor {
                tier: Tier::Diamond,
                display_name: "Diamond",
                min_mmr_inclusive: 3000,
                max_mmr_inclusive: Some(3499),
            },
            MmrReferenceAnchor {
                tier: Tier::Master,
                display_name: "Master",
                min_mmr_inclusive: 3500,
                max_mmr_inclusive: None,
            },
            MmrReferenceAnchor {
                tier: Tier::Grandmaster,
                display_name: "Grandmaster",
                min_mmr_inclusive: 3500,
                max_mmr_inclusive: None,
            },
            MmrReferenceAnchor {
                tier: Tier::Challenger,
                display_name: "Challenger",
                min_mmr_inclusive: 3500,
                max_mmr_inclusive: None,
            },
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::{mmr_reference_scale, Tier};

    #[test]
    fn mmr_reference_scale_keeps_rank_anchors_contiguous_until_diamond() {
        let scale = mmr_reference_scale();
        let bounded_anchors = &scale.anchors[..7];

        for pair in bounded_anchors.windows(2) {
            let current = &pair[0];
            let next = &pair[1];
            assert_eq!(
                current.max_mmr_inclusive.map(|value| value + 1),
                Some(next.min_mmr_inclusive)
            );
        }
    }

    #[test]
    fn mmr_reference_scale_marks_apex_tiers_as_open_ended_heuristics() {
        let scale = mmr_reference_scale();

        assert_eq!(scale.kind, "community_heuristic");
        assert!(scale.not_official);

        let apex_tiers = [Tier::Master, Tier::Grandmaster, Tier::Challenger];
        for tier in apex_tiers {
            let anchor = scale
                .anchors
                .iter()
                .find(|anchor| anchor.tier == tier)
                .unwrap_or_else(|| panic!("missing apex anchor for {tier:?}"));

            assert_eq!(anchor.min_mmr_inclusive, 3500);
            assert_eq!(anchor.max_mmr_inclusive, None);
        }
    }
}
