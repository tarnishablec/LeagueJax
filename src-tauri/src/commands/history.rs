use std::collections::HashSet;
use std::sync::Arc;

use crate::concepts::cherry::CherryAugment;
use crate::concepts::matches::{RawMatchSummariesResponse, RawMatchSummaryGame};
use crate::concepts::summoner::{
    RankedQueueStats, RankedSummary, SummonerInfo, SummonerSearchResult,
};
use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use crate::shards::sgp::config::{sgp_servers_config, SgpServersConfig};
use crate::shards::sgp::SgpShard;
use crate::shards::static_cache::StaticCacheShard;
use jax::Jax;
use serde_json::Value;
use tauri::State;
use uuid::Uuid;

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn first_string(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| value.get(*key).and_then(Value::as_str))
        .map(ToString::to_string)
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

    // International servers: LCU alias lookup is local-only, so restrict
    // to the focused server.
    if requested == focused {
        return Ok(requested);
    }

    Err(AppError::Other(format!(
        "Cross-region search is not supported for international servers (focused: {focused}, requested: {requested})"
    )))
}

async fn search_aliases_with_target_server(
    aliases: Vec<crate::shards::lcu::api::SummonerAliasEntry>,
    target_sgp_server_id: &str,
    same_server: bool,
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

    // The aliases response already contains gameName, tagLine, profileIconId,
    // summonerLevel — use them directly for same-server searches.
    if same_server {
        return Ok(aliases
            .into_iter()
            .map(|alias| SummonerSearchResult {
                puuid: alias.puuid,
                game_name: alias.game_name,
                tag_line: alias.tag_line,
                profile_icon_id: alias.profile_icon_id,
                summoner_level: alias.summoner_level,
                sgp_server_id: target_sgp_server_id.to_string(),
            })
            .collect());
    }

    // Cross-region: verify the summoner exists on the target server via SGP.
    let mut results = Vec::new();
    for alias in aliases {
        let Ok(Some(summoner)) = sgp_api
            .get_summoner_by_puuid(target_sgp_server_id, &alias.puuid)
            .await
        else {
            continue;
        };

        results.push(SummonerSearchResult {
            puuid: summoner.puuid,
            game_name: alias.game_name,
            tag_line: alias.tag_line,
            profile_icon_id: summoner.profile_icon_id,
            summoner_level: summoner.summoner_level,
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
            let Some(sgp_summoner) = sgp_api
                .get_summoner_by_puuid(&target_sgp_server_id, &puuid)
                .await?
            else {
                return Ok(Vec::new());
            };

            Ok(vec![SummonerSearchResult {
                puuid: sgp_summoner.puuid.clone(),
                game_name: non_empty_or(&sgp_summoner.game_name, &puuid),
                tag_line: sgp_summoner.tag_line.clone(),
                profile_icon_id: sgp_summoner.profile_icon_id,
                summoner_level: sgp_summoner.summoner_level,
                sgp_server_id: target_sgp_server_id,
            }])
        }
        ParsedSummonerSearchQuery::Exact {
            game_name,
            tag_line,
        } => {
            let aliases = lcu_api
                .get_summoner_aliases(&game_name, Some(&tag_line))
                .await?;
            search_aliases_with_target_server(
                aliases,
                &target_sgp_server_id,
                same_server,
                &sgp_api,
            )
            .await
        }
        ParsedSummonerSearchQuery::Fuzzy { game_name } => {
            let aliases = lcu_api.get_summoner_aliases(&game_name, None).await?;
            search_aliases_with_target_server(
                aliases,
                &target_sgp_server_id,
                same_server,
                &sgp_api,
            )
            .await
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
) -> Result<RawMatchSummariesResponse, AppError> {
    let lcu_shard = jax.get_shard::<LcuShard>();
    let lcu_client = lcu_shard.focused().await?;
    let sgp_api = jax.get_shard::<SgpShard>().spg_from_lcu(lcu_client)?.api();

    let count = end_index.saturating_sub(begin_index);
    if count == 0 {
        return Ok(RawMatchSummariesResponse { games: vec![] });
    }

    let normalized_tag = tag.and_then(|raw| {
        let trimmed = raw.trim();
        if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("all") {
            None
        } else {
            Some(trimmed.to_string())
        }
    });

    sgp_api
        .get_match_summaries(
            &puuid,
            begin_index,
            count,
            normalized_tag.as_deref(),
            sgp_server_id.as_deref(),
        )
        .await
}

#[tauri::command]
pub async fn get_cherry_augments(
    _force_refresh: Option<bool>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<CherryAugment>, AppError> {
    let lcu = jax.get_shard::<LcuShard>().focused().await?;
    let api = lcu.api();
    let version = api.get_game_version().await?;
    jax.get_shard::<StaticCacheShard>()
        .get_or_init("lcu-cache.json", "lcu_cherry_augments", &version, || {
            api.get_cherry_augments()
        })
        .await
}

#[tauri::command]
pub async fn get_match_summary(
    game_id: u64,
    sgp_server_id: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<RawMatchSummaryGame, AppError> {
    let lcu_shard = jax.get_shard::<LcuShard>();
    let focused_pid = lcu_shard.focused_pid().await?;
    let lcu_client = lcu_shard.client(focused_pid)?;
    let sgp_api = jax.get_shard::<SgpShard>().spg_from_lcu(lcu_client)?.api();

    sgp_api
        .get_match_summary(game_id, sgp_server_id.as_deref())
        .await
}
