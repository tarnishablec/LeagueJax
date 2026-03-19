use std::sync::Arc;

use crate::concepts::matches::{
    MatchDetail, MatchOutcome, MatchSummary, MatchSummaryParticipant, Participant,
};
use crate::concepts::summoner::{RankedQueueStats, RankedSummary, SummonerInfo};
use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use crate::shards::sgp::SgpShard;
use jax::Jax;
use serde_json::Value;
use tauri::State;
// ─── DTOs ────────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

pub fn parse_summoner(v: &Value) -> Result<SummonerInfo, AppError> {
    Ok(SummonerInfo {
        puuid: v["puuid"].as_str().unwrap_or_default().to_string(),
        game_name: v["gameName"].as_str().unwrap_or_default().to_string(),
        tag_line: v["tagLine"].as_str().unwrap_or_default().to_string(),
        profile_icon_id: v["profileIconId"].as_i64().unwrap_or(0),
        summoner_level: v["summonerLevel"].as_i64().unwrap_or(0),
    })
}

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
        items,
        map_id: first_i64(payload, &["mapId", "map_id"]).unwrap_or(0),
        game_duration: first_i64(payload, &["gameDuration", "game_length"]).unwrap_or(0),
        game_mode: first_string(payload, &["gameMode", "game_mode"]).unwrap_or_default(),
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
    let game_name = first_string(participant, &["riotIdGameName", "gameName"])
        .unwrap_or(fallback_game_name);
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
    let game_name = first_string(participant, &["riotIdGameName", "gameName"])
        .unwrap_or(fallback_game_name);
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
    let ended_in_early_surrender = participant_stat_bool(participant, stats, "gameEndedInEarlySurrender")
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

// ─── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_current_summoner(jax: State<'_, Arc<Jax>>) -> Result<SummonerInfo, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager
        .focused_client()
        .await
        .ok_or(AppError::LcuNotConnected)?;
    let resp = lcu.get("/lol-summoner/v1/current-summoner").await?;
    parse_summoner(&resp)
}

#[tauri::command]
pub async fn search_summoner(
    game_name: String,
    tag_line: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<SummonerInfo, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager
        .focused_client()
        .await
        .ok_or(AppError::LcuNotConnected)?;

    let encoded_name = urlencoding::encode(&game_name);
    let encoded_tag = urlencoding::encode(&tag_line);
    let path = format!("/lol-summoner/v2/summoners?name={encoded_name}&tagLine={encoded_tag}");

    let resp = lcu.get(&path).await?;

    // Handle both object and array responses
    let summoner_val = if let Some(arr) = resp.as_array() {
        arr.first()
            .ok_or_else(|| AppError::Other("Summoner not found".to_string()))?
            .clone()
    } else if resp.is_object() {
        // Check if it's an error response
        if resp.get("puuid").is_some() {
            resp
        } else {
            return Err(AppError::Other("Summoner not found".to_string()));
        }
    } else {
        return Err(AppError::Other("Summoner not found".to_string()));
    };

    parse_summoner(&summoner_val)
}

#[tauri::command]
pub async fn get_summoner_by_puuid(
    puuid: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<SummonerInfo, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager
        .focused_client()
        .await
        .ok_or(AppError::LcuNotConnected)?;

    let encoded_puuid = urlencoding::encode(&puuid);
    let path = format!("/lol-summoner/v2/summoners/puuid/{encoded_puuid}");
    let resp = lcu.get(&path).await?;

    parse_summoner(&resp)
}

#[tauri::command]
pub async fn get_ranked_summary(
    puuid: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<RankedSummary, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager
        .focused_client()
        .await
        .ok_or(AppError::LcuNotConnected)?;

    let path = format!("/lol-ranked/v1/ranked-stats/{puuid}");
    let response = lcu.get(&path).await?;

    Ok(parse_ranked_summary(&response))
}

#[tauri::command]
pub async fn get_match_summaries(
    puuid: String,
    begin_index: u32,
    end_index: u32,
    tag: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<MatchSummary>, AppError> {
    let sgp_shard = jax.get_shard::<SgpShard>();
    let token_context = sgp_shard.get_or_refresh_token_context(jax.inner()).await?;
    let sgp_api = sgp_shard
        .api()
        .ok_or_else(|| AppError::Other("SGP shard is not initialized".to_string()))?;

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
            &token_context,
            &puuid,
            begin_index,
            count,
            normalized_tag.as_deref(),
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
pub async fn get_match_detail(
    game_id: u64,
    jax: State<'_, Arc<Jax>>,
) -> Result<MatchDetail, AppError> {
    let sgp_shard = jax.get_shard::<SgpShard>();
    let token_context = sgp_shard.get_or_refresh_token_context(jax.inner()).await?;
    let sgp_api = sgp_shard
        .api()
        .ok_or_else(|| AppError::Other("SGP shard is not initialized".to_string()))?;

    let response = sgp_api.get_game_summary(&token_context, game_id).await?;
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
