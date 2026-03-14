use std::sync::Arc;

use crate::concepts::matches::{MatchDetail, MatchSummary, Participant};
use crate::concepts::summoner::SummonerInfo;
use crate::error::{AppError, Result};
use crate::jax::Jax;
use crate::shards::lcu::LcuShard;
use serde_json::Value;
use tauri::State;

// ─── DTOs ────────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

pub fn parse_summoner(v: &Value) -> Result<SummonerInfo> {
    Ok(SummonerInfo {
        puuid: v["puuid"].as_str().unwrap_or_default().to_string(),
        game_name: v["gameName"].as_str().unwrap_or_default().to_string(),
        tag_line: v["tagLine"].as_str().unwrap_or_default().to_string(),
        profile_icon_id: v["profileIconId"].as_i64().unwrap_or(0),
        summoner_level: v["summonerLevel"].as_i64().unwrap_or(0),
    })
}

fn parse_match_summary(game: &Value) -> Result<MatchSummary> {
    let stats = &game["participants"][0]["stats"];
    let total_minions = stats["totalMinionsKilled"].as_i64().unwrap_or(0);
    let neutral_minions = stats["neutralMinionsKilled"].as_i64().unwrap_or(0);

    Ok(MatchSummary {
        game_id: game["gameId"].as_u64().unwrap_or(0),
        champion_id: game["participants"][0]["championId"].as_i64().unwrap_or(0),
        win: stats["win"].as_bool().unwrap_or(false),
        kills: stats["kills"].as_i64().unwrap_or(0),
        deaths: stats["deaths"].as_i64().unwrap_or(0),
        assists: stats["assists"].as_i64().unwrap_or(0),
        cs: total_minions + neutral_minions,
        game_duration: game["gameDuration"].as_i64().unwrap_or(0),
        game_mode: game["gameMode"].as_str().unwrap_or_default().to_string(),
        game_creation: game["gameCreation"].as_i64().unwrap_or(0),
        queue_id: game["queueId"].as_i64().unwrap_or(0),
    })
}

fn parse_participant(p: &Value) -> Participant {
    let stats = &p["stats"];

    let mut items = [0i64; 7];
    for i in 0..7 {
        items[i] = stats[format!("item{i}")].as_i64().unwrap_or(0);
    }

    let total_minions = stats["totalMinionsKilled"].as_i64().unwrap_or(0);
    let neutral_minions = stats["neutralMinionsKilled"].as_i64().unwrap_or(0);

    Participant {
        puuid: p["puuid"].as_str().unwrap_or_default().to_string(),
        champion_id: p["championId"].as_i64().unwrap_or(0),
        summoner_name: p["summonerName"]
            .as_str()
            .or_else(|| p["gameName"].as_str())
            .unwrap_or_default()
            .to_string(),
        team_id: p["teamId"].as_i64().unwrap_or(0),
        kills: stats["kills"].as_i64().unwrap_or(0),
        deaths: stats["deaths"].as_i64().unwrap_or(0),
        assists: stats["assists"].as_i64().unwrap_or(0),
        total_damage_dealt_to_champions: stats["totalDamageDealtToChampions"].as_i64().unwrap_or(0),
        total_damage_taken: stats["totalDamageTaken"].as_i64().unwrap_or(0),
        gold_earned: stats["goldEarned"].as_i64().unwrap_or(0),
        vision_score: stats["visionScore"].as_i64().unwrap_or(0),
        cs: total_minions + neutral_minions,
        items,
        spell1_id: p["spell1Id"].as_i64().unwrap_or(0),
        spell2_id: p["spell2Id"].as_i64().unwrap_or(0),
        perk_primary_style: stats["perkPrimaryStyle"].as_i64().unwrap_or(0),
        perk_sub_style: stats["perkSubStyle"].as_i64().unwrap_or(0),
        win: stats["win"].as_bool().unwrap_or(false),
    }
}

// ─── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_current_summoner(jax: State<'_, Arc<Jax>>) -> Result<SummonerInfo> {
    let lcu = jax
        .get_shard::<LcuShard>()
        .client()
        .ok_or(AppError::LcuNotConnected)?;
    let resp = lcu.get("/lol-summoner/v1/current-summoner").await?;
    parse_summoner(&resp)
}

#[tauri::command]
pub async fn search_summoner(
    game_name: String,
    tag_line: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<SummonerInfo> {
    let lcu = jax
        .get_shard::<LcuShard>()
        .client()
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
) -> Result<Vec<MatchSummary>> {
    let lcu = jax
        .get_shard::<LcuShard>()
        .client()
        .ok_or(AppError::LcuNotConnected)?;
    let path = format!(
        "/lol-match-history/v1/products/lol/{puuid}/matches?begIndex={begin_index}&endIndex={end_index}"
    );
    let resp = lcu.get(&path).await?;

    let games = resp["games"]["games"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    let mut summaries = Vec::with_capacity(games.len());
    for game in &games {
        summaries.push(parse_match_summary(game)?);
    }

    Ok(summaries)
}

#[tauri::command]
pub async fn get_match_detail(game_id: u64, jax: State<'_, Arc<Jax>>) -> Result<MatchDetail> {
    let lcu = jax
        .get_shard::<LcuShard>()
        .client()
        .ok_or(AppError::LcuNotConnected)?;
    let path = format!("/lol-match-history/v1/games/{game_id}");
    let resp = lcu.get(&path).await?;

    let participants_raw = resp["participants"].as_array().cloned().unwrap_or_default();

    let participants: Vec<Participant> = participants_raw.iter().map(parse_participant).collect();

    Ok(MatchDetail {
        game_id: resp["gameId"].as_u64().unwrap_or(game_id),
        game_duration: resp["gameDuration"].as_i64().unwrap_or(0),
        game_mode: resp["gameMode"].as_str().unwrap_or_default().to_string(),
        game_creation: resp["gameCreation"].as_i64().unwrap_or(0),
        queue_id: resp["queueId"].as_i64().unwrap_or(0),
        participants,
    })
}
