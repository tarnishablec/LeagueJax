use std::sync::Arc;

use crate::concepts::matches::{MatchDetail, MatchSummary, Participant};
use crate::concepts::summoner::SummonerInfo;
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

    let total_minions = first_i64(stats, &["totalMinionsKilled"]).unwrap_or(0);
    let neutral_minions = first_i64(stats, &["neutralMinionsKilled"]).unwrap_or(0);

    Ok(MatchSummary {
        game_id: parse_sgp_game_id(payload, game),
        champion_id: first_i64(participant, &["championId"]).unwrap_or(0),
        win: stats.get("win").and_then(Value::as_bool).unwrap_or(false),
        kills: first_i64(stats, &["kills"]).unwrap_or(0),
        deaths: first_i64(stats, &["deaths"]).unwrap_or(0),
        assists: first_i64(stats, &["assists"]).unwrap_or(0),
        cs: total_minions + neutral_minions,
        game_duration: first_i64(payload, &["gameDuration", "game_length"]).unwrap_or(0),
        game_mode: first_string(payload, &["gameMode", "game_mode"]).unwrap_or_default(),
        game_creation: first_i64(payload, &["gameCreation", "game_datetime"]).unwrap_or(0),
        queue_id: first_i64(payload, &["queueId", "queue_id"]).unwrap_or(0),
    })
}

fn parse_sgp_participant(participant: &Value) -> Participant {
    let null = Value::Null;
    let stats = participant.get("stats").unwrap_or(&null);

    let mut items = [0i64; 7];
    for (index, item) in items.iter_mut().enumerate() {
        let key = format!("item{index}");
        *item = stats.get(&key).and_then(Value::as_i64).unwrap_or(0);
    }

    let total_minions = first_i64(stats, &["totalMinionsKilled"]).unwrap_or(0);
    let neutral_minions = first_i64(stats, &["neutralMinionsKilled"]).unwrap_or(0);

    Participant {
        puuid: first_string(participant, &["puuid"]).unwrap_or_default(),
        champion_id: first_i64(participant, &["championId"]).unwrap_or(0),
        summoner_name: first_string(
            participant,
            &["summonerName", "riotIdGameName", "gameName", "name"],
        )
        .unwrap_or_default(),
        team_id: first_i64(participant, &["teamId"]).unwrap_or(0),
        kills: first_i64(stats, &["kills"]).unwrap_or(0),
        deaths: first_i64(stats, &["deaths"]).unwrap_or(0),
        assists: first_i64(stats, &["assists"]).unwrap_or(0),
        total_damage_dealt_to_champions: first_i64(stats, &["totalDamageDealtToChampions"])
            .unwrap_or(0),
        total_damage_taken: first_i64(stats, &["totalDamageTaken"]).unwrap_or(0),
        gold_earned: first_i64(stats, &["goldEarned"]).unwrap_or(0),
        vision_score: first_i64(stats, &["visionScore"]).unwrap_or(0),
        cs: total_minions + neutral_minions,
        items,
        spell1_id: first_i64(participant, &["spell1Id"]).unwrap_or(0),
        spell2_id: first_i64(participant, &["spell2Id"]).unwrap_or(0),
        perk_primary_style: first_i64(stats, &["perkPrimaryStyle"]).unwrap_or(0),
        perk_sub_style: first_i64(stats, &["perkSubStyle"]).unwrap_or(0),
        win: stats.get("win").and_then(Value::as_bool).unwrap_or(false),
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

fn first_i64(value: &Value, keys: &[&str]) -> Option<i64> {
    keys.iter().find_map(|key| {
        value
            .get(*key)
            .and_then(Value::as_i64)
            .or_else(|| value.get(*key).and_then(Value::as_u64).and_then(|v| i64::try_from(v).ok()))
    })
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
pub async fn get_match_history(
    puuid: String,
    begin_index: u32,
    end_index: u32,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<MatchSummary>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let token_context = manager.exchange_sgp_token_context().await?;
    let sgp_api = jax
        .get_shard::<SgpShard>()
        .api()
        .ok_or_else(|| AppError::Other("SGP shard is not initialized".to_string()))?;

    let count = end_index.saturating_sub(begin_index);
    if count == 0 {
        return Ok(Vec::new());
    }

    let response = sgp_api
        .get_match_history(&token_context, &puuid, begin_index, count)
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
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let token_context = manager.exchange_sgp_token_context().await?;
    let sgp_api = jax
        .get_shard::<SgpShard>()
        .api()
        .ok_or_else(|| AppError::Other("SGP shard is not initialized".to_string()))?;

    let response = sgp_api.get_game_summary(&token_context, game_id).await?;
    let payload = sgp_summary_payload(&response);

    let participants_raw = payload
        .get("participants")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    let participants: Vec<Participant> = participants_raw.iter().map(parse_sgp_participant).collect();

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
