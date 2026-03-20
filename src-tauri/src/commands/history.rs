use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use crate::concepts::maps::LcuMap;
use crate::concepts::matches::{
    CherryAugment, MatchDetail, MatchOutcome, MatchSummary, MatchSummaryParticipant, Participant,
};
use crate::concepts::summoner::{
    RankedQueueStats, RankedSummary, SummonerInfo, SummonerSearchResult,
};
use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use crate::shards::sgp::config::{sgp_servers_config, SgpServersConfig};
use crate::shards::sgp::SgpShard;
use jax::Jax;
use serde_json::Value;
use tauri::State;
use uuid::Uuid;
// ─── DTOs ────────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn parse_sgp_match_summary(game: &Value, target_puuid: &str) -> Result<MatchSummary, AppError> {
    let payload = sgp_summary_payload(game);
    let participants = payload
        .get("participants")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::Other("SGP summary is missing participants".to_string()))?;

    let participant = participants
        .iter()
        .find(|participant| {
            participant
                .get("puuid")
                .and_then(Value::as_str)
                .is_some_and(|puuid| puuid == target_puuid)
        })
        .or_else(|| participants.first())
        .ok_or_else(|| AppError::Other("SGP summary participants are empty".to_string()))?;

    let null = Value::Null;
    let stats = participant.get("stats").unwrap_or(&null);
    let team_id = first_i64(participant, &["teamId"]).unwrap_or(0);

    let total_minions =
        participant_stat_i64(participant, stats, &["totalMinionsKilled"]).unwrap_or(0);
    let neutral_minions =
        participant_stat_i64(participant, stats, &["neutralMinionsKilled"]).unwrap_or(0);
    let total_damage =
        participant_stat_i64(participant, stats, &["totalDamageDealtToChampions"]).unwrap_or(0);

    let team_total_damage: i64 = participants
        .iter()
        .filter(|entry| first_i64(entry, &["teamId"]).unwrap_or(0) == team_id)
        .map(|entry| {
            let entry_stats = entry.get("stats").unwrap_or(&null);
            participant_stat_i64(entry, entry_stats, &["totalDamageDealtToChampions"]).unwrap_or(0)
        })
        .sum();
    let damage_share = if team_total_damage > 0 {
        total_damage as f64 / team_total_damage as f64
    } else {
        0.0
    };
    let items = participant_items(participant, stats);
    let player_augments = participant_augments(participant, stats);
    let perk_ids = participant_perk_ids(participant, stats);
    let perk_primary_rune_id = perk_ids.primary_rune_id.unwrap_or(0);
    let perk_sub_style_id = perk_ids.sub_style_id.unwrap_or(0);
    let win = participant_stat_bool(participant, stats, "win").unwrap_or(false);
    let outcome = participant_match_outcome(participant, stats, payload, win);

    #[cfg(debug_assertions)]
    {
        tracing::debug!(
            target_puuid,
            game_id = parse_sgp_game_id(payload, game),
            perk_primary_rune_id,
            perk_sub_style_id,
            raw_perk0 = first_i64(stats, &["perk0"])
                .or_else(|| first_i64(participant, &["perk0"]))
                .unwrap_or(0),
            raw_perk_sub_style = first_i64(stats, &["perkSubStyle"])
                .or_else(|| first_i64(participant, &["perkSubStyle"]))
                .unwrap_or(0),
            participant_styles = ?style_debug_entries(participant),
            stats_styles = ?style_debug_entries(stats),
            "parsed perk ids from SGP summary"
        );
    }

    Ok(MatchSummary {
        game_id: parse_sgp_game_id(payload, game),
        champion_id: first_i64(participant, &["championId"]).unwrap_or(0),
        win,
        outcome,
        team_id,
        kills: participant_stat_i64(participant, stats, &["kills"]).unwrap_or(0),
        deaths: participant_stat_i64(participant, stats, &["deaths"]).unwrap_or(0),
        assists: participant_stat_i64(participant, stats, &["assists"]).unwrap_or(0),
        cs: total_minions + neutral_minions,
        total_damage_dealt_to_champions: total_damage,
        damage_share,
        spell1_id: first_i64(participant, &["spell1Id"]).unwrap_or(0),
        spell2_id: first_i64(participant, &["spell2Id"]).unwrap_or(0),
        perk_primary_rune_id,
        perk_sub_style_id,
        player_augments,
        items,
        map_id: first_i64(payload, &["mapId", "map_id"]).unwrap_or(0),
        game_duration: first_i64(payload, &["gameDuration", "game_length"]).unwrap_or(0),
        game_mode: first_string(payload, &["gameMode", "game_mode"]).unwrap_or_default(),
        game_mutator: first_string(
            payload,
            &["gameMutator", "game_mutator", "gameVariant", "game_variant"],
        )
        .unwrap_or_default(),
        game_creation: first_i64(payload, &["gameCreation", "game_datetime"]).unwrap_or(0),
        queue_id: first_i64(payload, &["queueId", "queue_id"]).unwrap_or(0),
        participants: participants
            .iter()
            .map(parse_sgp_summary_participant)
            .collect(),
    })
}

fn parse_sgp_summary_participant(participant: &Value) -> MatchSummaryParticipant {
    let summoner_name = first_string(
        participant,
        &["summonerName", "riotIdGameName", "gameName", "name"],
    )
    .unwrap_or_default();
    let (fallback_game_name, fallback_tag_line) = split_riot_id(&summoner_name);
    let game_name =
        first_string(participant, &["riotIdGameName", "gameName"]).unwrap_or(fallback_game_name);
    let tag_line = first_string(participant, &["riotIdTagline", "riotIdTagLine", "tagLine"])
        .unwrap_or(fallback_tag_line);

    MatchSummaryParticipant {
        puuid: first_string(participant, &["puuid"]).unwrap_or_default(),
        champion_id: first_i64(participant, &["championId"]).unwrap_or(0),
        game_name,
        tag_line,
        team_id: first_i64(participant, &["teamId"]).unwrap_or(0),
    }
}

fn parse_sgp_participant(participant: &Value) -> Participant {
    let null = Value::Null;
    let stats = participant.get("stats").unwrap_or(&null);

    let items = participant_items(participant, stats);
    let total_minions =
        participant_stat_i64(participant, stats, &["totalMinionsKilled"]).unwrap_or(0);
    let neutral_minions =
        participant_stat_i64(participant, stats, &["neutralMinionsKilled"]).unwrap_or(0);
    let perk_ids = participant_perk_ids(participant, stats);
    let summoner_name = first_string(
        participant,
        &["summonerName", "riotIdGameName", "gameName", "name"],
    )
    .unwrap_or_default();
    let (fallback_game_name, fallback_tag_line) = split_riot_id(&summoner_name);
    let game_name =
        first_string(participant, &["riotIdGameName", "gameName"]).unwrap_or(fallback_game_name);
    let tag_line = first_string(participant, &["riotIdTagline", "riotIdTagLine", "tagLine"])
        .unwrap_or(fallback_tag_line);

    Participant {
        puuid: first_string(participant, &["puuid"]).unwrap_or_default(),
        champion_id: first_i64(participant, &["championId"]).unwrap_or(0),
        summoner_name,
        game_name,
        tag_line,
        team_id: first_i64(participant, &["teamId"]).unwrap_or(0),
        kills: participant_stat_i64(participant, stats, &["kills"]).unwrap_or(0),
        deaths: participant_stat_i64(participant, stats, &["deaths"]).unwrap_or(0),
        assists: participant_stat_i64(participant, stats, &["assists"]).unwrap_or(0),
        total_damage_dealt_to_champions: participant_stat_i64(
            participant,
            stats,
            &["totalDamageDealtToChampions"],
        )
        .unwrap_or(0),
        total_damage_taken: participant_stat_i64(participant, stats, &["totalDamageTaken"])
            .unwrap_or(0),
        gold_earned: participant_stat_i64(participant, stats, &["goldEarned"]).unwrap_or(0),
        vision_score: participant_stat_i64(participant, stats, &["visionScore"]).unwrap_or(0),
        cs: total_minions + neutral_minions,
        items,
        spell1_id: first_i64(participant, &["spell1Id"]).unwrap_or(0),
        spell2_id: first_i64(participant, &["spell2Id"]).unwrap_or(0),
        perk_primary_style: perk_ids.primary_style_id.unwrap_or(0),
        perk_sub_style: perk_ids.sub_style_id.unwrap_or(0),
        win: participant_stat_bool(participant, stats, "win").unwrap_or(false),
    }
}

fn sgp_summary_payload(game: &Value) -> &Value {
    if let Some(payload) = game.get("json") {
        payload
    } else {
        game
    }
}

fn parse_sgp_game_id(payload: &Value, game: &Value) -> u64 {
    if let Some(game_id) = payload
        .get("gameId")
        .and_then(Value::as_u64)
        .or_else(|| payload.get("game_id").and_then(Value::as_u64))
    {
        return game_id;
    }

    let match_id = game
        .get("metadata")
        .and_then(|metadata| metadata.get("match_id"))
        .and_then(Value::as_str)
        .or_else(|| {
            game.get("metadata")
                .and_then(|metadata| metadata.get("matchId"))
                .and_then(Value::as_str)
        });

    match_id
        .and_then(|identifier| identifier.rsplit('_').next())
        .and_then(|suffix| suffix.parse::<u64>().ok())
        .unwrap_or(0)
}

fn first_string(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| value.get(*key).and_then(Value::as_str))
        .map(ToString::to_string)
}

fn bool_from_value(value: &Value) -> Option<bool> {
    value
        .as_bool()
        .or_else(|| value.as_i64().map(|current| current != 0))
        .or_else(|| value.as_u64().map(|current| current != 0))
        .or_else(|| {
            value.as_str().and_then(|raw| {
                let normalized = raw.trim().to_ascii_lowercase();
                match normalized.as_str() {
                    "true" | "1" => Some(true),
                    "false" | "0" => Some(false),
                    _ => None,
                }
            })
        })
}

fn first_bool(value: &Value, keys: &[&str]) -> Option<bool> {
    keys.iter()
        .find_map(|key| value.get(*key).and_then(bool_from_value))
}

fn first_i64(value: &Value, keys: &[&str]) -> Option<i64> {
    keys.iter().find_map(|key| {
        value.get(*key).and_then(Value::as_i64).or_else(|| {
            value
                .get(*key)
                .and_then(Value::as_u64)
                .and_then(|v| i64::try_from(v).ok())
        })
    })
}

fn split_riot_id(value: &str) -> (String, String) {
    if let Some((game_name, tag_line)) = value.split_once('#') {
        return (game_name.to_string(), tag_line.to_string());
    }

    (value.to_string(), String::new())
}

fn participant_stat_i64(participant: &Value, stats: &Value, keys: &[&str]) -> Option<i64> {
    first_i64(stats, keys).or_else(|| first_i64(participant, keys))
}

fn participant_stat_bool(participant: &Value, stats: &Value, key: &str) -> Option<bool> {
    first_bool(stats, &[key]).or_else(|| first_bool(participant, &[key]))
}

fn participant_stat_string(participant: &Value, stats: &Value, keys: &[&str]) -> Option<String> {
    first_string(stats, keys).or_else(|| first_string(participant, keys))
}

fn parse_cherry_augment(value: &Value) -> Option<CherryAugment> {
    let id = first_i64(value, &["id"])?;
    let name_tra = first_string(value, &["nameTRA", "nameTra", "name"]).unwrap_or_default();
    let augment_small_icon_path =
        first_string(value, &["augmentSmallIconPath", "iconPath"]).unwrap_or_default();
    let rarity = first_string(value, &["rarity"]).unwrap_or_default();

    Some(CherryAugment {
        id,
        name_tra,
        augment_small_icon_path,
        rarity,
    })
}

fn parse_cherry_augments(value: &Value) -> Vec<CherryAugment> {
    value
        .as_array()
        .map(|entries| entries.iter().filter_map(parse_cherry_augment).collect())
        .unwrap_or_default()
}

fn normalize_status_text(value: &str) -> String {
    value
        .chars()
        .filter(|current| current.is_ascii_alphanumeric())
        .map(|current| current.to_ascii_lowercase())
        .collect()
}

fn is_terminated_result(value: &str) -> bool {
    let normalized = normalize_status_text(value);
    normalized.contains("abort")
        || normalized.contains("terminated")
        || normalized.contains("cancel")
        || normalized.contains("invalid")
}

fn is_remake_result(value: &str) -> bool {
    let normalized = normalize_status_text(value);
    normalized.contains("remake")
        || normalized.contains("earlysurrender")
        || normalized.contains("surrenderedearly")
}

fn participant_match_outcome(
    participant: &Value,
    stats: &Value,
    payload: &Value,
    win: bool,
) -> MatchOutcome {
    let ended_in_early_surrender =
        participant_stat_bool(participant, stats, "gameEndedInEarlySurrender")
            .or_else(|| first_bool(payload, &["gameEndedInEarlySurrender"]))
            .unwrap_or(false);

    let terminated_flag = participant_stat_bool(participant, stats, "aborted")
        .or_else(|| participant_stat_bool(participant, stats, "gameTerminated"))
        .or_else(|| participant_stat_bool(participant, stats, "gameEndedInAbort"))
        .or_else(|| first_bool(payload, &["aborted", "gameTerminated", "gameEndedInAbort"]))
        .unwrap_or(false);

    let end_of_game_result = participant_stat_string(
        participant,
        stats,
        &[
            "endOfGameResult",
            "end_of_game_result",
            "gameEndResult",
            "game_end_result",
        ],
    )
    .or_else(|| {
        first_string(
            payload,
            &[
                "endOfGameResult",
                "end_of_game_result",
                "gameEndResult",
                "game_end_result",
            ],
        )
    });

    if terminated_flag {
        return MatchOutcome::Terminated;
    }

    if let Some(raw) = end_of_game_result.as_deref() {
        if is_terminated_result(raw) {
            return MatchOutcome::Terminated;
        }
    }

    if ended_in_early_surrender {
        return MatchOutcome::Remake;
    }

    if let Some(raw) = end_of_game_result.as_deref() {
        if is_remake_result(raw) {
            return MatchOutcome::Remake;
        }
    }

    if win {
        MatchOutcome::Victory
    } else {
        MatchOutcome::Defeat
    }
}

fn participant_items(participant: &Value, stats: &Value) -> [i64; 7] {
    let mut items = [0i64; 7];
    for (index, item) in items.iter_mut().enumerate() {
        let key = format!("item{index}");
        *item = participant_stat_i64(participant, stats, &[&key]).unwrap_or(0);
    }
    items
}

fn participant_augments(participant: &Value, stats: &Value) -> [i64; 6] {
    let mut augments = [0i64; 6];
    for (index, augment_id) in augments.iter_mut().enumerate() {
        let key = format!("playerAugment{}", index + 1);
        *augment_id = participant_stat_i64(participant, stats, &[&key]).unwrap_or(0);
    }
    augments
}

fn perks_styles(value: &Value) -> Option<&Vec<Value>> {
    value
        .get("perks")
        .and_then(|perks| perks.get("styles"))
        .and_then(Value::as_array)
}

fn style_matches_description(style: &Value, description: &str) -> bool {
    style
        .get("description")
        .and_then(Value::as_str)
        .is_some_and(|desc| desc.eq_ignore_ascii_case(description))
}

fn style_id(style: &Value) -> Option<i64> {
    first_i64(style, &["style"])
}

fn first_style_selection_perk_id(style: &Value) -> Option<i64> {
    style
        .get("selections")
        .and_then(Value::as_array)
        .and_then(|selections| selections.first())
        .and_then(|selection| first_i64(selection, &["perk"]))
}

#[derive(Clone, Copy, Default)]
struct PerkIdsFromStyles {
    primary_style_id: Option<i64>,
    sub_style_id: Option<i64>,
    primary_rune_id: Option<i64>,
}

fn pick_primary_style(styles: &[Value]) -> Option<&Value> {
    styles
        .iter()
        .find(|style| style_matches_description(style, "primaryStyle"))
        .or_else(|| styles.first())
}

fn pick_sub_style<'a>(styles: &'a [Value], primary_style: Option<&Value>) -> Option<&'a Value> {
    let described_sub = styles
        .iter()
        .find(|style| style_matches_description(style, "subStyle"));
    if described_sub.is_some() {
        return described_sub;
    }

    let primary_id = primary_style.and_then(style_id);
    if let Some(id) = primary_id {
        let different_style = styles
            .iter()
            .find(|style| style_id(style).is_some_and(|candidate| candidate != id));
        if different_style.is_some() {
            return different_style;
        }
    }

    styles.get(1)
}

fn fill_perk_ids_from_styles(styles: &[Value], result: &mut PerkIdsFromStyles) {
    let primary_style = pick_primary_style(styles);
    let sub_style = pick_sub_style(styles, primary_style);

    if result.primary_style_id.is_none() {
        result.primary_style_id = primary_style.and_then(style_id);
    }
    if result.sub_style_id.is_none() {
        result.sub_style_id = sub_style.and_then(style_id);
    }
    if result.primary_rune_id.is_none() {
        result.primary_rune_id = primary_style.and_then(first_style_selection_perk_id);
    }
}

fn normalize_sub_style(participant: &Value, stats: &Value, result: &mut PerkIdsFromStyles) {
    if result.sub_style_id != result.primary_style_id {
        return;
    }

    let Some(primary_id) = result.primary_style_id else {
        return;
    };

    for styles in [perks_styles(participant), perks_styles(stats)] {
        let Some(styles) = styles else {
            continue;
        };

        if let Some(id) = styles
            .iter()
            .filter_map(style_id)
            .find(|candidate| *candidate != primary_id)
        {
            result.sub_style_id = Some(id);
            break;
        }
    }
}

fn perk_ids_from_styles(participant: &Value, stats: &Value) -> PerkIdsFromStyles {
    let mut result = PerkIdsFromStyles::default();

    for styles in [perks_styles(participant), perks_styles(stats)] {
        let Some(styles) = styles else {
            continue;
        };

        fill_perk_ids_from_styles(styles, &mut result);

        if result.primary_style_id.is_some()
            && result.sub_style_id.is_some()
            && result.primary_rune_id.is_some()
        {
            break;
        }
    }

    normalize_sub_style(participant, stats, &mut result);
    result
}

fn participant_perk_ids(participant: &Value, stats: &Value) -> PerkIdsFromStyles {
    let from_styles = perk_ids_from_styles(participant, stats);
    PerkIdsFromStyles {
        primary_style_id: from_styles
            .primary_style_id
            .or_else(|| first_i64(stats, &["perkPrimaryStyle"]))
            .or_else(|| first_i64(participant, &["perkPrimaryStyle"])),
        sub_style_id: from_styles
            .sub_style_id
            .or_else(|| first_i64(stats, &["perkSubStyle"]))
            .or_else(|| first_i64(participant, &["perkSubStyle"])),
        primary_rune_id: from_styles
            .primary_rune_id
            .or_else(|| first_i64(stats, &["perk0"]))
            .or_else(|| first_i64(participant, &["perk0"])),
    }
}

#[cfg(debug_assertions)]
fn style_debug_entries(value: &Value) -> Vec<String> {
    let Some(styles) = perks_styles(value) else {
        return Vec::new();
    };

    styles
        .iter()
        .map(|style| {
            let description = style
                .get("description")
                .and_then(Value::as_str)
                .unwrap_or("unknown");
            let id = style_id(style).unwrap_or(0);
            format!("{description}:{id}")
        })
        .collect()
}

fn queue_type_matches(entry: &Value, queue_type: &str) -> bool {
    first_string(entry, &["queueType", "queue_type"])
        .is_some_and(|current| current.eq_ignore_ascii_case(queue_type))
}

fn find_ranked_queue<'a>(value: &'a Value, queue_type: &str) -> Option<&'a Value> {
    if let Some(map) = value.get("queueMap").and_then(Value::as_object) {
        if let Some(entry) = map.get(queue_type) {
            return Some(entry);
        }

        let lower = queue_type.to_lowercase();
        if let Some(entry) = map.get(&lower) {
            return Some(entry);
        }

        let upper = queue_type.to_uppercase();
        if let Some(entry) = map.get(&upper) {
            return Some(entry);
        }
    }

    if let Some(queues) = value.get("queues").and_then(Value::as_array) {
        if let Some(entry) = queues
            .iter()
            .find(|entry| queue_type_matches(entry, queue_type))
        {
            return Some(entry);
        }
    }

    value.as_array().and_then(|queues| {
        queues
            .iter()
            .find(|entry| queue_type_matches(entry, queue_type))
    })
}

fn parse_ranked_queue(entry: &Value, queue_type: &str) -> Option<RankedQueueStats> {
    if !entry.is_object() {
        return None;
    }

    Some(RankedQueueStats {
        queue_type: queue_type.to_string(),
        tier: first_string(entry, &["tier"]).unwrap_or_else(|| "UNRANKED".to_string()),
        division: first_string(entry, &["division", "rank"]).unwrap_or_default(),
        league_points: first_i64(entry, &["leaguePoints", "league_points", "lp"]).unwrap_or(0),
        wins: first_i64(entry, &["wins"]).unwrap_or(0),
        losses: first_i64(entry, &["losses"]).unwrap_or(0),
    })
}

fn parse_ranked_summary(value: &Value) -> RankedSummary {
    let solo = find_ranked_queue(value, "RANKED_SOLO_5x5")
        .and_then(|entry| parse_ranked_queue(entry, "RANKED_SOLO_5x5"));
    let flex = find_ranked_queue(value, "RANKED_FLEX_SR")
        .and_then(|entry| parse_ranked_queue(entry, "RANKED_FLEX_SR"));

    RankedSummary { solo, flex }
}

#[derive(Debug, Clone)]
enum ParsedSummonerSearchQuery {
    Puuid(String),
    Exact { game_name: String, tag_line: String },
    Fuzzy { game_name: String },
}

fn parse_summoner_search_query(query: &str) -> Result<ParsedSummonerSearchQuery, AppError> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Err(AppError::Other("Search query is empty".to_string()));
    }

    if Uuid::parse_str(trimmed).is_ok() {
        return Ok(ParsedSummonerSearchQuery::Puuid(trimmed.to_string()));
    }

    if let Some((game_name, tag_line)) = trimmed.split_once('#') {
        let game_name = game_name.trim();
        let tag_line = tag_line.trim();
        if game_name.is_empty() || tag_line.is_empty() {
            return Err(AppError::Other(
                "Invalid exact query, expected gameName#tagLine".to_string(),
            ));
        }
        return Ok(ParsedSummonerSearchQuery::Exact {
            game_name: game_name.to_string(),
            tag_line: tag_line.to_string(),
        });
    }

    Ok(ParsedSummonerSearchQuery::Fuzzy {
        game_name: trimmed.to_string(),
    })
}

fn normalize_sgp_server_id(server_id: Option<String>, fallback: &str) -> String {
    server_id
        .map(|raw| raw.trim().to_uppercase())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| fallback.to_uppercase())
}

fn normalize_server_id(server_id: &str) -> String {
    server_id.trim().to_uppercase()
}

fn tencent_server_set(config: &SgpServersConfig) -> HashSet<String> {
    config
        .tencent_server_summoner_interoperability
        .iter()
        .map(|server_id| normalize_server_id(server_id))
        .collect()
}

fn to_tencent_canonical_server_id(server_id: &str, tencent_servers: &HashSet<String>) -> String {
    let normalized = normalize_server_id(server_id);
    if normalized.is_empty() {
        return normalized;
    }
    if normalized.starts_with("TENCENT_") {
        return normalized;
    }

    let prefixed = format!("TENCENT_{normalized}");
    if tencent_servers.contains(&prefixed) {
        return prefixed;
    }

    normalized
}

fn is_tencent_server_id(server_id: &str, tencent_servers: &HashSet<String>) -> bool {
    let normalized = normalize_server_id(server_id);
    if normalized.is_empty() {
        return false;
    }
    if normalized.starts_with("TENCENT_") {
        return true;
    }
    if tencent_servers.contains(&normalized) {
        return true;
    }
    tencent_servers.contains(&format!("TENCENT_{normalized}"))
}

fn non_empty_or(value: &str, fallback: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed.to_string()
    }
}

fn build_nameset_index(
    namesets: &crate::shards::lcu::api::PlayerAccountNamesetsResponse,
) -> HashMap<String, (String, String)> {
    let mut index = HashMap::new();
    for nameset in &namesets.namesets {
        let Some(gnt) = &nameset.gnt else {
            continue;
        };
        index.insert(
            nameset.puuid.clone(),
            (gnt.game_name.clone(), gnt.tag_line.clone()),
        );
    }
    index
}

fn build_summoner_search_result(
    summoner: SummonerInfo,
    sgp_server_id: String,
    fallback_game_name: &str,
    fallback_tag_line: &str,
) -> SummonerSearchResult {
    SummonerSearchResult {
        puuid: summoner.puuid,
        game_name: non_empty_or(&summoner.game_name, fallback_game_name),
        tag_line: non_empty_or(&summoner.tag_line, fallback_tag_line),
        profile_icon_id: summoner.profile_icon_id,
        summoner_level: summoner.summoner_level,
        sgp_server_id,
    }
}

fn resolve_target_sgp_server_id(
    focused_sgp_server_id: &str,
    requested_sgp_server_id: Option<String>,
    config: &SgpServersConfig,
) -> Result<String, AppError> {
    let mut allowed_tencent_servers = tencent_server_set(config);
    let focused = to_tencent_canonical_server_id(focused_sgp_server_id, &allowed_tencent_servers);
    let requested = to_tencent_canonical_server_id(
        &normalize_sgp_server_id(requested_sgp_server_id, &focused),
        &allowed_tencent_servers,
    );

    if is_tencent_server_id(&focused, &allowed_tencent_servers) {
        allowed_tencent_servers.insert(focused.clone());

        if allowed_tencent_servers.contains(&requested) {
            return Ok(requested);
        }

        return Err(AppError::Other(format!(
            "Requested Tencent server is not in summoner interoperability list: {requested}"
        )));
    }

    if requested == focused {
        return Ok(requested);
    }

    Err(AppError::Other(format!(
        "Cross-region summoner search is disabled for non-Tencent focused server: focused={focused}, requested={requested}"
    )))
}

async fn search_aliases_with_target_server(
    aliases: Vec<crate::shards::lcu::api::PlayerAccountAliasEntry>,
    target_sgp_server_id: &str,
    same_server: bool,
    lcu_api: &crate::shards::lcu::api::LcuApi,
    sgp_api: &crate::shards::sgp::api::SgpApi,
) -> Result<Vec<SummonerSearchResult>, AppError> {
    let mut dedupe = HashSet::new();
    let aliases: Vec<_> = aliases
        .into_iter()
        .filter(|entry| dedupe.insert(entry.puuid.clone()))
        .collect();

    if aliases.is_empty() {
        return Ok(Vec::new());
    }

    let puuids: Vec<String> = aliases.iter().map(|entry| entry.puuid.clone()).collect();
    let nameset_index = lcu_api
        .get_player_account_namesets(&puuids)
        .await
        .map(|response| build_nameset_index(&response))
        .unwrap_or_default();

    let mut results = Vec::new();
    for alias in aliases {
        let (resolved_game_name, resolved_tag_line) = nameset_index
            .get(&alias.puuid)
            .cloned()
            .unwrap_or_else(|| (alias.alias.game_name.clone(), alias.alias.tag_line.clone()));

        if same_server {
            let Ok(summoner) = lcu_api.get_summoner_by_puuid(&alias.puuid).await else {
                continue;
            };
            results.push(build_summoner_search_result(
                summoner,
                target_sgp_server_id.to_string(),
                &resolved_game_name,
                &resolved_tag_line,
            ));
            continue;
        }

        let Ok(summoner) = sgp_api
            .get_summoner_by_puuid(target_sgp_server_id, &alias.puuid)
            .await
        else {
            continue;
        };
        let Some(summoner) = summoner else {
            continue;
        };

        results.push(SummonerSearchResult {
            puuid: summoner.puuid,
            game_name: resolved_game_name,
            tag_line: resolved_tag_line,
            profile_icon_id: summoner.profile_icon_id,
            summoner_level: summoner.level,
            sgp_server_id: target_sgp_server_id.to_string(),
        });
    }

    Ok(results)
}

// ─── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_current_summoner(jax: State<'_, Arc<Jax>>) -> Result<SummonerInfo, AppError> {
    jax.get_shard::<LcuShard>()
        .focused()
        .await?
        .api()
        .get_current_summoner()
        .await
}

#[tauri::command]
pub async fn get_current_sgp_server_id(jax: State<'_, Arc<Jax>>) -> Result<String, AppError> {
    let lcu_client = jax.get_shard::<LcuShard>().focused().await?;
    let token_context = lcu_client.exchange_sgp_token_context().await?;
    Ok(token_context.sgp_server_id)
}

#[tauri::command]
pub async fn get_sgp_servers_config() -> Result<SgpServersConfig, AppError> {
    Ok(sgp_servers_config()?.clone())
}

#[tauri::command]
pub async fn search_summoner(
    game_name: String,
    tag_line: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<Value, AppError> {
    let lcu_api = jax.get_shard::<LcuShard>().focused().await?.api();
    lcu_api.search_summoner(&game_name, &tag_line).await
}

#[tauri::command]
pub async fn search_summoners(
    query: String,
    sgp_server_id: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<SummonerSearchResult>, AppError> {
    let parsed_query = parse_summoner_search_query(&query)?;
    let lcu_client = jax.get_shard::<LcuShard>().focused().await?;
    let lcu_api = lcu_client.api();
    let current_token_context = lcu_client.exchange_sgp_token_context().await?;
    let config = sgp_servers_config()?;

    let target_sgp_server_id =
        resolve_target_sgp_server_id(&current_token_context.sgp_server_id, sgp_server_id, config)?;
    let current_sgp_server_id = to_tencent_canonical_server_id(
        &current_token_context.sgp_server_id,
        &tencent_server_set(config),
    );
    let same_server = target_sgp_server_id == current_sgp_server_id;

    let sgp_api = jax.get_shard::<SgpShard>().spg_from_lcu(lcu_client)?.api();

    match parsed_query {
        ParsedSummonerSearchQuery::Puuid(puuid) => {
            if same_server {
                let summoner = lcu_api.get_summoner_by_puuid(&puuid).await?;
                return Ok(vec![build_summoner_search_result(
                    summoner,
                    target_sgp_server_id,
                    &puuid,
                    "",
                )]);
            }

            let Some(sgp_summoner) = sgp_api
                .get_summoner_by_puuid(&target_sgp_server_id, &puuid)
                .await?
            else {
                return Ok(Vec::new());
            };

            let (resolved_game_name, resolved_tag_line) = lcu_api
                .get_player_account_namesets(std::slice::from_ref(&puuid))
                .await
                .ok()
                .and_then(|response| build_nameset_index(&response).remove(&puuid))
                .unwrap_or_else(|| (puuid.clone(), String::new()));

            Ok(vec![SummonerSearchResult {
                puuid: sgp_summoner.puuid,
                game_name: resolved_game_name,
                tag_line: resolved_tag_line,
                profile_icon_id: sgp_summoner.profile_icon_id,
                summoner_level: sgp_summoner.level,
                sgp_server_id: target_sgp_server_id,
            }])
        }
        ParsedSummonerSearchQuery::Exact {
            game_name,
            tag_line,
        } => {
            let aliases = lcu_api
                .get_player_account_aliases(&game_name, Some(&tag_line))
                .await?;
            return search_aliases_with_target_server(
                aliases,
                &target_sgp_server_id,
                same_server,
                &lcu_api,
                &sgp_api,
            )
            .await;
        }
        ParsedSummonerSearchQuery::Fuzzy { game_name } => {
            let aliases = lcu_api.get_player_account_aliases(&game_name, None).await?;
            return search_aliases_with_target_server(
                aliases,
                &target_sgp_server_id,
                same_server,
                &lcu_api,
                &sgp_api,
            )
            .await;
        }
    }
}

#[tauri::command]
pub async fn get_summoner_by_puuid(
    puuid: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<SummonerInfo, AppError> {
    jax.get_shard::<LcuShard>()
        .focused()
        .await?
        .api()
        .get_summoner_by_puuid(&puuid)
        .await
}

#[tauri::command]
pub async fn get_ranked_summary(
    puuid: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<RankedSummary, AppError> {
    let lcu_api = jax.get_shard::<LcuShard>().focused().await?.api();
    let response = lcu_api.get_ranked_stats(&puuid).await?;

    Ok(parse_ranked_summary(&response))
}

#[tauri::command]
pub async fn get_match_summaries(
    puuid: String,
    begin_index: u32,
    end_index: u32,
    tag: Option<String>,
    sgp_server_id: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<MatchSummary>, AppError> {
    let lcu_shard = jax.get_shard::<LcuShard>();
    let lcu_client = lcu_shard.focused().await?;
    let sgp_api = jax.get_shard::<SgpShard>().spg_from_lcu(lcu_client)?.api();

    let count = end_index.saturating_sub(begin_index);
    if count == 0 {
        return Ok(Vec::new());
    }

    let normalized_tag = tag.and_then(|raw| {
        let trimmed = raw.trim();
        if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("all") {
            None
        } else {
            Some(trimmed.to_string())
        }
    });

    let response = sgp_api
        .get_match_summaries(
            &puuid,
            begin_index,
            count,
            normalized_tag.as_deref(),
            sgp_server_id.as_deref(),
        )
        .await?;

    let games = response
        .get("games")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    let mut summaries = Vec::with_capacity(games.len());
    for game in &games {
        summaries.push(parse_sgp_match_summary(game, &puuid)?);
    }

    Ok(summaries)
}

#[tauri::command]
pub async fn get_cherry_augments(
    _force_refresh: Option<bool>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<CherryAugment>, AppError> {
    let response = jax
        .get_shard::<LcuShard>()
        .focused()
        .await?
        .api()
        .get_cherry_augments()
        .await?;
    let parsed = parse_cherry_augments(&response);

    Ok(parsed)
}

#[tauri::command]
pub async fn get_lcu_maps(jax: State<'_, Arc<Jax>>) -> Result<Vec<LcuMap>, AppError> {
    let response = jax
        .get_shard::<LcuShard>()
        .focused()
        .await?
        .api()
        .get_maps()
        .await?;

    Ok(serde_json::from_value::<Vec<LcuMap>>(response)?)
}

#[tauri::command]
pub async fn get_match_detail(
    game_id: u64,
    sgp_server_id: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<MatchDetail, AppError> {
    let lcu_shard = jax.get_shard::<LcuShard>();
    let focused_pid = lcu_shard.focused_pid().await?;
    let lcu_client = lcu_shard.client(focused_pid)?;
    let sgp_api = jax.get_shard::<SgpShard>().spg_from_lcu(lcu_client)?.api();

    let response = sgp_api
        .get_game_summary(game_id, sgp_server_id.as_deref())
        .await?;
    let payload = sgp_summary_payload(&response);

    let participants_raw = payload
        .get("participants")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    let participants: Vec<Participant> =
        participants_raw.iter().map(parse_sgp_participant).collect();

    Ok(MatchDetail {
        game_id: {
            let parsed = parse_sgp_game_id(payload, &response);
            if parsed == 0 {
                game_id
            } else {
                parsed
            }
        },
        game_duration: first_i64(payload, &["gameDuration", "game_length"]).unwrap_or(0),
        game_mode: first_string(payload, &["gameMode", "game_mode"]).unwrap_or_default(),
        game_creation: first_i64(payload, &["gameCreation", "game_datetime"]).unwrap_or(0),
        queue_id: first_i64(payload, &["queueId", "queue_id"]).unwrap_or(0),
        participants,
    })
}
