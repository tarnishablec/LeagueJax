use std::time::Duration;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::AppError;

mod settings;

pub use settings::OpggShard;

const OPGG_CHAMPION_API: &str = "https://lol-api-champion.op.gg";
const COUNTER_SAMPLE_FLOOR: u32 = 80;

#[derive(
    Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, TS, strum::AsRefStr,
)]
#[ts(export, export_to = "opgg.ts")]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum OpggRegion {
    #[default]
    Global,
    Na,
    Me,
    Euw,
    Eune,
    Oce,
    Kr,
    Jp,
    Br,
    Las,
    Lan,
    Ru,
    Tr,
    Sea,
    Tw,
    Vn,
}

#[derive(
    Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, TS, strum::AsRefStr,
)]
#[ts(export, export_to = "opgg.ts")]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum OpggRankTier {
    All,
    Challenger,
    Grandmaster,
    MasterPlus,
    Master,
    DiamondPlus,
    Diamond,
    #[default]
    EmeraldPlus,
    Emerald,
    PlatinumPlus,
    Platinum,
    GoldPlus,
    Gold,
    Silver,
    Bronze,
    Iron,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "opgg.ts")]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OpggFiltersDto {
    pub region: OpggRegion,
    pub tier: OpggRankTier,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "opgg.ts")]
#[serde(rename_all = "camelCase")]
pub struct OpggChampionListDto {
    pub filters: OpggFiltersDto,
    pub version: String,
    pub champions: Vec<OpggChampionSummaryDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "opgg.ts")]
#[serde(rename_all = "camelCase")]
pub struct OpggChampionSummaryDto {
    pub id: u32,
    pub win_rate: f64,
    pub pick_rate: f64,
    pub ban_rate: f64,
    pub tier: u32,
    pub positions: Vec<OpggPositionSummaryDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "opgg.ts")]
#[serde(rename_all = "camelCase")]
pub struct OpggPositionSummaryDto {
    pub position: String,
    pub win_rate: f64,
    pub pick_rate: f64,
    pub role_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "opgg.ts")]
#[serde(rename_all = "camelCase")]
pub struct OpggChampionDetailDto {
    pub filters: OpggFiltersDto,
    pub counter_column_limit: usize,
    pub id: u32,
    pub position: String,
    pub version: String,
    pub win_rate: f64,
    pub pick_rate: f64,
    pub ban_rate: f64,
    pub tier: u32,
    pub summoner_spells: Vec<OpggBuildDto>,
    pub starter_items: Vec<OpggBuildDto>,
    pub boots: Vec<OpggBuildDto>,
    pub core_items: Vec<OpggBuildDto>,
    pub last_items: Vec<OpggBuildDto>,
    pub skill_priority: Vec<String>,
    pub skill_order: Vec<String>,
    pub skill_pick_rate: f64,
    pub skill_win_rate: f64,
    pub strong_against: Vec<OpggCounterDto>,
    pub weak_against: Vec<OpggCounterDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "opgg.ts")]
#[serde(rename_all = "camelCase")]
pub struct OpggBuildDto {
    pub ids: Vec<u32>,
    pub play: u32,
    pub pick_rate: f64,
    pub win_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "opgg.ts")]
#[serde(rename_all = "camelCase")]
pub struct OpggCounterDto {
    pub champion_id: u32,
    pub play: u32,
    pub win_rate: f64,
}

#[derive(Debug, Deserialize)]
struct RawEnvelope<T> {
    meta: RawMeta,
    data: T,
}

#[derive(Debug, Deserialize)]
struct RawMeta {
    version: String,
}

#[derive(Debug, Deserialize)]
struct RawSummary {
    id: u32,
    average_stats: RawAverageStats,
    #[serde(default)]
    positions: Vec<RawPosition>,
}

#[derive(Debug, Deserialize)]
struct RawAverageStats {
    #[serde(default)]
    win_rate: f64,
    #[serde(default)]
    pick_rate: f64,
    #[serde(default)]
    ban_rate: f64,
    #[serde(default)]
    tier: u32,
}

#[derive(Debug, Deserialize)]
struct RawPosition {
    name: String,
    stats: RawPositionStats,
}

#[derive(Debug, Deserialize)]
struct RawPositionStats {
    #[serde(default)]
    win_rate: f64,
    #[serde(default)]
    pick_rate: f64,
    #[serde(default)]
    role_rate: f64,
    #[serde(default)]
    ban_rate: f64,
    #[serde(default)]
    tier_data: Option<RawTierData>,
}

#[derive(Debug, Deserialize)]
struct RawTierData {
    #[serde(default)]
    tier: u32,
}

#[derive(Debug, Deserialize)]
struct RawDetail {
    summary: RawSummary,
    #[serde(default)]
    summoner_spells: Vec<RawBuild>,
    #[serde(default)]
    core_items: Vec<RawBuild>,
    #[serde(default)]
    boots: Vec<RawBuild>,
    #[serde(default)]
    starter_items: Vec<RawBuild>,
    #[serde(default)]
    last_items: Vec<RawBuild>,
    #[serde(default)]
    skill_masteries: Vec<RawSkillMastery>,
    #[serde(default)]
    skills: Vec<RawSkill>,
    #[serde(default)]
    counters: Vec<RawCounter>,
}

#[derive(Debug, Deserialize)]
struct RawBuild {
    #[serde(default)]
    ids: Vec<u32>,
    #[serde(default)]
    win: u32,
    #[serde(default)]
    play: u32,
    #[serde(default)]
    pick_rate: f64,
}

#[derive(Debug, Deserialize)]
struct RawSkillMastery {
    #[serde(default)]
    ids: Vec<String>,
    #[serde(default)]
    play: u32,
    #[serde(default)]
    win: u32,
    #[serde(default)]
    pick_rate: f64,
    #[serde(default)]
    builds: Vec<RawSkill>,
}

#[derive(Debug, Deserialize)]
struct RawSkill {
    #[serde(default)]
    order: Vec<String>,
    #[serde(default)]
    play: u32,
    #[serde(default)]
    win: u32,
    #[serde(default)]
    pick_rate: f64,
}

#[derive(Debug, Clone, Deserialize)]
struct RawCounter {
    champion_id: i64,
    #[serde(default)]
    play: i64,
    #[serde(default)]
    win: i64,
}

pub async fn list_champions(
    client: &reqwest::Client,
    timeout: Duration,
    filters: OpggFiltersDto,
) -> Result<OpggChampionListDto, AppError> {
    let envelope: RawEnvelope<Vec<RawSummary>> =
        get_json(champion_request(client, timeout, filters, None)).await?;
    let mut champions = envelope
        .data
        .into_iter()
        .filter(|summary| summary.id > 0)
        .map(summary_dto)
        .collect::<Vec<_>>();
    champions.sort_by(|left, right| {
        left.tier
            .cmp(&right.tier)
            .then(right.win_rate.total_cmp(&left.win_rate))
            .then(left.id.cmp(&right.id))
    });

    Ok(OpggChampionListDto {
        filters,
        version: envelope.meta.version,
        champions,
    })
}

pub async fn champion_detail(
    client: &reqwest::Client,
    timeout: Duration,
    champion_id: u32,
    position: &str,
    filters: OpggFiltersDto,
    counter_column_limit: usize,
) -> Result<OpggChampionDetailDto, AppError> {
    let counter_column_limit = settings::validate_counter_column_limit(counter_column_limit)?;
    let position = normalize_position(position)?;
    let envelope: RawEnvelope<RawDetail> = get_json(champion_request(
        client,
        timeout,
        filters,
        Some((champion_id, &position)),
    ))
    .await?;
    Ok(detail_dto(
        envelope.meta.version,
        position,
        envelope.data,
        filters,
        counter_column_limit,
    ))
}

fn summary_dto(summary: RawSummary) -> OpggChampionSummaryDto {
    OpggChampionSummaryDto {
        id: summary.id,
        win_rate: summary.average_stats.win_rate,
        pick_rate: summary.average_stats.pick_rate,
        ban_rate: summary.average_stats.ban_rate,
        tier: summary.average_stats.tier,
        positions: summary
            .positions
            .into_iter()
            .filter_map(|position| {
                let name = normalize_position(&position.name).ok()?;
                Some(OpggPositionSummaryDto {
                    position: name,
                    win_rate: position.stats.win_rate,
                    pick_rate: position.stats.pick_rate,
                    role_rate: position.stats.role_rate,
                })
            })
            .collect(),
    }
}

fn detail_dto(
    version: String,
    position: String,
    detail: RawDetail,
    filters: OpggFiltersDto,
    counter_column_limit: usize,
) -> OpggChampionDetailDto {
    let lane = detail
        .summary
        .positions
        .iter()
        .find(|entry| entry.name.eq_ignore_ascii_case(&position));
    let (skill_priority, skill_order, skill_pick_rate, skill_win_rate) = skill_summary(&detail);
    let (strong_against, weak_against) = split_matchups(&detail.counters, counter_column_limit);

    OpggChampionDetailDto {
        filters,
        counter_column_limit,
        id: detail.summary.id,
        position,
        version,
        win_rate: lane
            .map(|entry| entry.stats.win_rate)
            .unwrap_or(detail.summary.average_stats.win_rate),
        pick_rate: lane
            .map(|entry| entry.stats.pick_rate)
            .unwrap_or(detail.summary.average_stats.pick_rate),
        ban_rate: lane
            .map(|entry| entry.stats.ban_rate)
            .unwrap_or(detail.summary.average_stats.ban_rate),
        tier: lane
            .and_then(|entry| entry.stats.tier_data.as_ref().map(|tier| tier.tier))
            .filter(|tier| *tier > 0)
            .unwrap_or(detail.summary.average_stats.tier),
        summoner_spells: builds(&detail.summoner_spells, 2),
        starter_items: builds(&detail.starter_items, 1),
        boots: builds(&detail.boots, 1),
        core_items: builds(&detail.core_items, 3),
        last_items: builds(&detail.last_items, 6),
        skill_priority,
        skill_order,
        skill_pick_rate,
        skill_win_rate,
        strong_against,
        weak_against,
    }
}

fn builds(items: &[RawBuild], limit: usize) -> Vec<OpggBuildDto> {
    items
        .iter()
        .filter(|item| !item.ids.is_empty())
        .take(limit)
        .map(|item| OpggBuildDto {
            ids: item.ids.clone(),
            play: item.play,
            pick_rate: item.pick_rate,
            win_rate: rate(item.win, item.play),
        })
        .collect()
}

fn skill_summary(detail: &RawDetail) -> (Vec<String>, Vec<String>, f64, f64) {
    if let Some(mastery) = detail.skill_masteries.first() {
        let order = mastery
            .builds
            .first()
            .map(|build| build.order.clone())
            .filter(|order| !order.is_empty())
            .unwrap_or_else(|| {
                detail
                    .skills
                    .first()
                    .map(|skill| skill.order.clone())
                    .unwrap_or_default()
            });
        return (
            mastery.ids.clone(),
            order,
            mastery.pick_rate,
            rate(mastery.win, mastery.play),
        );
    }

    let Some(skill) = detail.skills.first() else {
        return (Vec::new(), Vec::new(), 0.0, 0.0);
    };
    (
        Vec::new(),
        skill.order.clone(),
        skill.pick_rate,
        rate(skill.win, skill.play),
    )
}

// OP.GG reports one win rate per opponent, from this champion's point of view.
// The high end is who they beat; the low end is who beats them. Taking both
// ends of one sorted list keeps a matchup from appearing on both sides.
fn split_matchups(
    counters: &[RawCounter],
    counter_column_limit: usize,
) -> (Vec<OpggCounterDto>, Vec<OpggCounterDto>) {
    let mut ranked = counters
        .iter()
        .filter(|counter| counter.champion_id > 0 && counter.play > 0)
        .map(|counter| OpggCounterDto {
            champion_id: counter.champion_id as u32,
            play: counter.play as u32,
            win_rate: rate(counter.win.max(0) as u32, counter.play as u32),
        })
        .collect::<Vec<_>>();
    let substantial = ranked
        .iter()
        .filter(|counter| counter.play >= COUNTER_SAMPLE_FLOOR)
        .cloned()
        .collect::<Vec<_>>();
    if substantial.len() >= counter_column_limit {
        ranked = substantial;
    }
    ranked.sort_by(|left, right| right.win_rate.total_cmp(&left.win_rate));

    let take = counter_column_limit.min(ranked.len() / 2);
    if take == 0 {
        return (Vec::new(), Vec::new());
    }

    let strong_against = ranked[..take].to_vec();
    let weak_against = ranked[ranked.len() - take..]
        .iter()
        .rev()
        .cloned()
        .collect();
    (strong_against, weak_against)
}

fn rate(win: u32, play: u32) -> f64 {
    if play == 0 {
        0.0
    } else {
        f64::from(win) / f64::from(play)
    }
}

fn normalize_position(position: &str) -> Result<String, AppError> {
    let normalized = position.trim().to_ascii_uppercase();
    if matches!(
        normalized.as_str(),
        "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT"
    ) {
        return Ok(normalized);
    }

    Err(AppError::other(format!(
        "OP.GG position is not supported: {position}"
    )))
}

// List and detail requests must use the same region and rank scope. Enum-backed
// filters keep arbitrary input out of the URL path and query parameters.
fn champion_request(
    client: &reqwest::Client,
    timeout: Duration,
    filters: OpggFiltersDto,
    champion: Option<(u32, &str)>,
) -> reqwest::RequestBuilder {
    let base = format!(
        "{OPGG_CHAMPION_API}/api/{}/champions/ranked",
        filters.region.as_ref()
    );
    let url = match champion {
        Some((id, position)) => format!("{base}/{id}/{position}"),
        None => base,
    };
    client
        .get(format!("{url}?hl=zh_CN&tier={}", filters.tier.as_ref()))
        .header("User-Agent", "LeagueJax")
        .header("Accept", "application/json")
        .timeout(timeout)
}

async fn get_json<T: for<'de> Deserialize<'de>>(
    request: reqwest::RequestBuilder,
) -> Result<T, AppError> {
    let response = request
        .send()
        .await
        .map_err(|error| AppError::other(format!("OP.GG request failed: {error}")))?;
    let status = response.status();
    let bytes = response
        .bytes()
        .await
        .map_err(|error| AppError::other(format!("OP.GG response could not be read: {error}")))?;
    if !status.is_success() {
        return Err(AppError::other(format!(
            "OP.GG request failed with status {status}"
        )));
    }

    serde_json::from_slice(&bytes)
        .map_err(|error| AppError::other(format!("OP.GG response could not be parsed: {error}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn filters_default_to_global_emerald_plus() {
        let filters = OpggFiltersDto::default();
        assert_eq!(filters.region, OpggRegion::Global);
        assert_eq!(filters.tier, OpggRankTier::EmeraldPlus);
    }

    #[test]
    fn supported_filter_values_match_request_serialization(
    ) -> Result<(), Box<dyn std::error::Error>> {
        for value in [
            "global", "na", "me", "euw", "eune", "oce", "kr", "jp", "br", "las", "lan", "ru", "tr",
            "sea", "tw", "vn",
        ] {
            let region: OpggRegion = serde_json::from_value(serde_json::json!(value))?;
            assert_eq!(region.as_ref(), value);
            assert_eq!(serde_json::to_value(region)?, serde_json::json!(value));
        }
        for value in [
            "all",
            "challenger",
            "grandmaster",
            "master_plus",
            "master",
            "diamond_plus",
            "diamond",
            "emerald_plus",
            "emerald",
            "platinum_plus",
            "platinum",
            "gold_plus",
            "gold",
            "silver",
            "bronze",
            "iron",
        ] {
            let tier: OpggRankTier = serde_json::from_value(serde_json::json!(value))?;
            assert_eq!(tier.as_ref(), value);
            assert_eq!(serde_json::to_value(tier)?, serde_json::json!(value));
        }
        Ok(())
    }

    #[test]
    fn filters_reject_unsupported_or_incomplete_scopes() {
        for value in [
            serde_json::json!({"region": "cn", "tier": "emerald_plus"}),
            serde_json::json!({"region": "../kr", "tier": "all"}),
            serde_json::json!({"region": "global", "tier": "unknown"}),
            serde_json::json!({"region": "global"}),
        ] {
            assert!(serde_json::from_value::<OpggFiltersDto>(value).is_err());
        }
    }

    #[test]
    fn list_and_detail_requests_use_identical_filters() -> Result<(), Box<dyn std::error::Error>> {
        // Tests bypass app startup; an already installed provider is also valid.
        let _ = rustls::crypto::ring::default_provider().install_default();
        let client = reqwest::Client::builder().no_proxy().build()?;
        for (filters, region, tier) in [
            (OpggFiltersDto::default(), "global", "emerald_plus"),
            (
                OpggFiltersDto {
                    region: OpggRegion::Kr,
                    tier: OpggRankTier::DiamondPlus,
                },
                "kr",
                "diamond_plus",
            ),
            (
                OpggFiltersDto {
                    region: OpggRegion::Sea,
                    tier: OpggRankTier::All,
                },
                "sea",
                "all",
            ),
        ] {
            for (champion, suffix) in [(None, ""), (Some((222, "ADC")), "/222/ADC")] {
                let request = champion_request(&client, Duration::from_secs(10), filters, champion)
                    .build()?;
                assert_eq!(request.url().host_str(), Some("lol-api-champion.op.gg"));
                assert_eq!(
                    request.url().path(),
                    format!("/api/{region}/champions/ranked{suffix}")
                );
                let query = request
                    .url()
                    .query_pairs()
                    .collect::<std::collections::HashMap<_, _>>();
                assert_eq!(query.get("tier").map(|value| value.as_ref()), Some(tier));
                assert_eq!(query.get("hl").map(|value| value.as_ref()), Some("zh_CN"));
                assert_eq!(query.len(), 2);
            }
        }
        Ok(())
    }

    #[test]
    fn detail_preserves_the_requested_scope() -> Result<(), serde_json::Error> {
        let raw: RawDetail = serde_json::from_value(serde_json::json!({
            "summary": {"id": 222, "average_stats": {}}
        }))?;
        let filters = OpggFiltersDto {
            region: OpggRegion::Kr,
            tier: OpggRankTier::DiamondPlus,
        };
        let detail = detail_dto("16.19".into(), "ADC".into(), raw, filters, 8);
        assert_eq!(detail.filters, filters);
        assert_eq!(detail.counter_column_limit, 8);
        assert_eq!(detail.id, 222);
        assert_eq!(detail.position, "ADC");
        Ok(())
    }

    fn counter(id: i64, win: i64, play: i64) -> RawCounter {
        RawCounter {
            champion_id: id,
            play,
            win,
        }
    }

    #[test]
    fn split_matchups_uses_both_ends_without_overlap() {
        let counters = vec![
            counter(1, 90, 100),
            counter(2, 80, 100),
            counter(3, 70, 100),
            counter(4, 60, 100),
            counter(5, 40, 100),
            counter(6, 30, 100),
            counter(7, 20, 100),
            counter(8, 10, 100),
            counter(9, 1, 10),
        ];

        let (strong, weak) = split_matchups(&counters, settings::DEFAULT_COUNTER_COLUMN_LIMIT);
        assert_eq!(
            strong
                .iter()
                .map(|entry| entry.champion_id)
                .collect::<Vec<_>>(),
            vec![1, 2, 3, 4]
        );
        assert_eq!(
            weak.iter()
                .map(|entry| entry.champion_id)
                .collect::<Vec<_>>(),
            vec![8, 7, 6, 5]
        );
    }

    #[test]
    fn split_matchups_applies_configured_limit_without_overlap() {
        let counters = (1..=120)
            .map(|id| counter(id, 121 - id, 120))
            .collect::<Vec<_>>();
        for limit in [1, 3, 8, 50] {
            let (strong, weak) = split_matchups(&counters, limit);
            assert_eq!(strong.len(), limit);
            assert_eq!(weak.len(), limit);
            assert_eq!(strong[0].champion_id, 1);
            assert_eq!(weak[0].champion_id, 120);
            assert!(strong.iter().all(|entry| weak
                .iter()
                .all(|opponent| opponent.champion_id != entry.champion_id)));
        }
    }

    #[test]
    fn split_matchups_keeps_columns_disjoint_when_data_is_insufficient() {
        for total in [0, 1, 3, 7] {
            let counters = (1..=total)
                .map(|id| counter(id, 10 - id, 100))
                .collect::<Vec<_>>();
            let (strong, weak) = split_matchups(&counters, 50);
            assert_eq!(strong.len(), total as usize / 2);
            assert_eq!(weak.len(), total as usize / 2);
            assert!(strong.iter().all(|entry| weak
                .iter()
                .all(|opponent| opponent.champion_id != entry.champion_id)));
        }
    }

    #[test]
    fn split_matchups_uses_configured_limit_for_sample_fallback() {
        let counters = vec![
            counter(1, 60, 100),
            counter(2, 55, 100),
            counter(3, 45, 100),
            counter(4, 40, 100),
            counter(5, 9, 10),
            counter(6, 1, 10),
        ];
        let (strong, weak) = split_matchups(&counters, 2);
        assert_eq!(strong[0].champion_id, 1);
        assert_eq!(weak[0].champion_id, 4);
        let (strong, weak) = split_matchups(&counters, 8);
        assert_eq!(strong.len(), 3);
        assert_eq!(weak.len(), 3);
        assert_eq!(strong[0].champion_id, 5);
        assert_eq!(weak[0].champion_id, 6);
    }

    #[test]
    fn normalize_position_rejects_unknown_lanes() {
        assert_eq!(normalize_position("mid").ok().as_deref(), Some("MID"));
        assert!(normalize_position("aram").is_err());
    }
}
