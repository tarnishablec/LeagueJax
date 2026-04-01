use std::collections::HashSet;
use std::sync::Arc;

use crate::shards::lcu::cherry::CherryAugment;
use crate::shards::sgp::matches::{RawMatchSummariesResponse, RawMatchSummaryGame};
use crate::shards::lcu::rank::RankStats;
use crate::shards::lcu::summoner::{SummonerInfo, SummonerSearchResult};
use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use crate::shards::sgp::config::{sgp_servers_config, SgpServersConfig};
use crate::shards::sgp::LcuSessionSgpExt;
use crate::shards::sgp::SgpShard;
use crate::shards::static_cache::StaticCacheShard;
use jax::Jax;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone)]
enum ParsedSummonerSearchQuery {
    Puuid(String),
    Exact { game_name: String, tag_line: String },
    Fuzzy { game_name: String },
}

fn parse_summoner_search_query(query: &str) -> Result<ParsedSummonerSearchQuery, AppError> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Err(AppError::other("Search query is empty".to_string()));
    }

    if Uuid::parse_str(trimmed).is_ok() {
        return Ok(ParsedSummonerSearchQuery::Puuid(trimmed.to_string()));
    }

    if let Some((game_name, tag_line)) = trimmed.split_once('#') {
        let game_name = game_name.trim();
        let tag_line = tag_line.trim();
        if game_name.is_empty() || tag_line.is_empty() {
            return Err(AppError::other(
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

        return Err(AppError::other(format!(
            "Requested Tencent server is not in summoner interoperability list: {requested}"
        )));
    }

    // International servers: LCU alias lookup is local-only, so restrict
    // to the focused server.
    if requested == focused {
        return Ok(requested);
    }

    Err(AppError::other(format!(
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
    // summonerLevel 鈥?use them directly for same-server searches.
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
                privacy: alias.privacy,
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
            privacy: summoner.privacy,
        });
    }

    Ok(results)
}

// 鈹€鈹€鈹€ Commands 鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€

#[tauri::command]
pub async fn get_current_summoner(jax: State<'_, Arc<Jax>>) -> Result<SummonerInfo, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    manager
        .focused()
        .await
        .ok_or(AppError::LcuNotConnected)?
        .api()
        .get_current_summoner()
        .await
}

#[tauri::command]
pub async fn get_current_sgp_server_id(jax: State<'_, Arc<Jax>>) -> Result<String, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let session = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let sgp_shard = jax.get_shard::<SgpShard>();
    let sgp_session = session.to_sgp(&sgp_shard).await?;
    Ok(sgp_session.api().sgp_server_id().to_string())
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
) -> Result<SummonerSearchResult, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let session = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    session.api().search_summoner(&game_name, &tag_line).await
}

#[tauri::command]
pub async fn search_summoners(
    query: String,
    sgp_server_id: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<SummonerSearchResult>, AppError> {
    let parsed_query = parse_summoner_search_query(&query)?;
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let session = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let lcu_api = session.api();
    let sgp_shard = jax.get_shard::<SgpShard>();
    let sgp_session = session.to_sgp(&sgp_shard).await?;
    let sgp_api = sgp_session.api();
    let current_sgp_server_id = sgp_api.sgp_server_id();
    let config = sgp_servers_config()?;

    let target_sgp_server_id =
        resolve_target_sgp_server_id(current_sgp_server_id, sgp_server_id, config)?;
    let current_sgp_server_id_canonical =
        to_tencent_canonical_server_id(current_sgp_server_id, &tencent_server_set(config));
    let same_server = target_sgp_server_id == current_sgp_server_id_canonical;

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
                game_name: sgp_summoner.game_name.clone(),
                tag_line: sgp_summoner.tag_line.clone(),
                profile_icon_id: sgp_summoner.profile_icon_id,
                summoner_level: sgp_summoner.summoner_level,
                sgp_server_id: target_sgp_server_id,
                privacy: sgp_summoner.privacy.clone(),
            }])
        }
        ParsedSummonerSearchQuery::Exact {
            game_name,
            tag_line,
        } => {
            let aliases = lcu_api
                .get_summoner_aliases(&game_name, Some(&tag_line))
                .await?;
            search_aliases_with_target_server(aliases, &target_sgp_server_id, same_server, sgp_api)
                .await
        }
        ParsedSummonerSearchQuery::Fuzzy { game_name } => {
            let aliases = lcu_api.get_summoner_aliases(&game_name, None).await?;
            search_aliases_with_target_server(aliases, &target_sgp_server_id, same_server, sgp_api)
                .await
        }
    }
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
    manager
        .focused()
        .await
        .ok_or(AppError::LcuNotConnected)?
        .api()
        .get_summoner_by_puuid(&puuid)
        .await
}

#[tauri::command]
pub async fn get_ranked_summary(
    puuid: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<RankStats, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let session = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let response = session.api().get_ranked_stats(&puuid).await?;
    Ok(response)
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
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let session = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let sgp_shard = jax.get_shard::<SgpShard>();
    let sgp_session = session.to_sgp(&sgp_shard).await?;

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

    sgp_session
        .api()
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
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let api = lcu.api();
    let version = lcu
        .cache()
        .get_or_try_init("game_version", || api.get_game_version())
        .await?;
    let region = lcu.auth().region.clone().unwrap_or_default();
    let cache_version = format!("{version}_{region}");
    jax.get_shard::<StaticCacheShard>()
        .get_or_init(
            "lcu-cache.json",
            "lcu_cherry_augments",
            &cache_version,
            || api.get_cherry_augments(),
        )
        .await
}

#[tauri::command]
pub async fn get_match_summary(
    game_id: u64,
    sgp_server_id: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<RawMatchSummaryGame, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let focused_pid = manager.focused_pid().await.ok_or(AppError::LcuNotConnected)?;
    let session = manager
        .session_for_pid(focused_pid)
        .ok_or(AppError::LcuNotConnected)?;
    let sgp_shard = jax.get_shard::<SgpShard>();
    let sgp_session = session.to_sgp(&sgp_shard).await?;

    sgp_session
        .api()
        .get_match_summary(game_id, sgp_server_id.as_deref())
        .await
}

