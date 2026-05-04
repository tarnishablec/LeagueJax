use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use crate::error::AppError;
use crate::shards::lcu::api::LcuApi;
use crate::shards::lcu::concepts::cherry::CherryAugment;
use crate::shards::lcu::concepts::rank::RankStats;
use crate::shards::lcu::concepts::summoner::{SummonerInfo, SummonerSearchResult};
use crate::shards::lcu::riot_client::{PlayerAccountAliasEntry, RiotClientHttpClient};
use crate::shards::lcu::static_data_cache::{
    lcu_static_data_cache_namespace, LCU_CHERRY_AUGMENTS_CACHE_FILE,
};
use crate::shards::lcu::LcuShard;
use crate::shards::sgp::api::SgpApi;
use crate::shards::sgp::config::{sgp_servers_config, SgpServersConfig};
use crate::shards::sgp::matches::{
    RawMatchDetailsGame, RawMatchSummariesResponse, RawMatchSummaryGame,
};
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

fn is_invisible_search_char(ch: char) -> bool {
    matches!(
        ch as u32,
        0x0000..=0x001F
            | 0x007F..=0x009F
            | 0x200B..=0x200D
            | 0x202A..=0x202E
            | 0x2060..=0x2069
            | 0xFEFF
            | 0xFFF9..=0xFFFB
    )
}

fn normalize_search_query(query: &str) -> String {
    query
        .chars()
        .filter(|ch| !is_invisible_search_char(*ch))
        .collect::<String>()
        .trim()
        .to_string()
}

fn parse_summoner_search_query(query: &str) -> Result<ParsedSummonerSearchQuery, AppError> {
    let trimmed = normalize_search_query(query);
    if trimmed.is_empty() {
        return Err(AppError::other("Search query is empty".to_string()));
    }

    if Uuid::parse_str(&trimmed).is_ok() {
        return Ok(ParsedSummonerSearchQuery::Puuid(trimmed));
    }

    if let Some((game_name, tag_line)) = trimmed.split_once('#') {
        let game_name = game_name.trim();
        let tag_line = tag_line.trim();
        if game_name.is_empty() || tag_line.is_empty() || tag_line.contains('#') {
            return Err(AppError::other(
                "Invalid exact query, expected gameName#tagLine".to_string(),
            ));
        }
        return Ok(ParsedSummonerSearchQuery::Exact {
            game_name: game_name.to_string(),
            tag_line: tag_line.to_string(),
        });
    }

    Ok(ParsedSummonerSearchQuery::Fuzzy { game_name: trimmed })
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

fn first_non_empty(values: &[&str]) -> String {
    values
        .iter()
        .map(|value| value.trim())
        .find(|value| !value.is_empty())
        .unwrap_or_default()
        .to_string()
}

fn summoner_level(summoner: &SummonerInfo) -> i64 {
    if summoner.summoner_level > 0 {
        summoner.summoner_level
    } else {
        summoner.level
    }
}

fn summoner_search_result(
    summoner: &SummonerInfo,
    target_sgp_server_id: &str,
    game_name_override: Option<&str>,
    tag_line_override: Option<&str>,
) -> SummonerSearchResult {
    SummonerSearchResult {
        puuid: summoner.puuid.clone(),
        game_name: first_non_empty(&[
            game_name_override.unwrap_or_default(),
            &summoner.game_name,
            &summoner.name,
        ]),
        tag_line: first_non_empty(&[tag_line_override.unwrap_or_default(), &summoner.tag_line]),
        profile_icon_id: summoner.profile_icon_id,
        summoner_level: summoner_level(summoner),
        sgp_server_id: target_sgp_server_id.to_string(),
        privacy: summoner.privacy.clone(),
    }
}

async fn resolve_nameset_identity(
    riot_client: &RiotClientHttpClient,
    puuid: &str,
) -> Option<(String, String)> {
    let response = riot_client
        .get_player_account_namesets(&[puuid.to_string()])
        .await
        .ok()?;

    response.namesets.into_iter().find_map(|nameset| {
        if !nameset.puuid.eq_ignore_ascii_case(puuid) {
            return None;
        }

        let game_name = nameset.gnt.game_name.trim().to_string();
        let tag_line = nameset.gnt.tag_line.trim().to_string();
        if game_name.is_empty() || tag_line.is_empty() {
            None
        } else {
            Some((game_name, tag_line))
        }
    })
}

async fn search_aliases_with_target_server(
    aliases: Vec<PlayerAccountAliasEntry>,
    target_sgp_server_id: &str,
    same_server: bool,
    use_sgp_validation: bool,
    lcu_api: &LcuApi,
    sgp_api: &SgpApi,
) -> Result<Vec<SummonerSearchResult>, AppError> {
    let mut dedupe = HashSet::new();
    let aliases: Vec<_> = aliases
        .into_iter()
        .filter_map(|mut entry| {
            let puuid = entry.puuid.trim().to_string();
            let puuid_key = puuid.to_ascii_lowercase();
            if puuid.is_empty() || !dedupe.insert(puuid_key) {
                return None;
            }
            entry.puuid = puuid;
            Some(entry)
        })
        .collect();

    if aliases.is_empty() {
        return Ok(Vec::new());
    }

    // Alias lookup only identifies account candidates; validate server membership separately.
    if use_sgp_validation || !same_server {
        let puuids: Vec<String> = aliases.iter().map(|alias| alias.puuid.clone()).collect();
        let summoners = sgp_api
            .get_summoners_by_puuids(target_sgp_server_id, &puuids)
            .await?;
        let summoners_by_puuid: HashMap<_, _> = summoners
            .into_iter()
            .map(|summoner| (summoner.puuid.to_ascii_lowercase(), summoner))
            .collect();

        return Ok(aliases
            .into_iter()
            .filter_map(|alias| {
                let summoner = summoners_by_puuid.get(&alias.puuid.to_ascii_lowercase())?;
                Some(summoner_search_result(
                    summoner,
                    target_sgp_server_id,
                    Some(&alias.alias.game_name),
                    Some(&alias.alias.tag_line),
                ))
            })
            .collect());
    }
    // summonerLevel 鈥?use them directly for same-server searches.
    let mut results = Vec::new();
    for alias in aliases {
        let Ok(Some(summoner)) = lcu_api.get_summoner_by_puuid_optional(&alias.puuid).await else {
            continue;
        };

        results.push(summoner_search_result(
            &summoner,
            target_sgp_server_id,
            Some(&alias.alias.game_name),
            Some(&alias.alias.tag_line),
        ));
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
    let game_name = normalize_search_query(&game_name);
    let tag_line = normalize_search_query(&tag_line);
    if game_name.is_empty() || tag_line.is_empty() {
        return Err(AppError::other(
            "Invalid exact query, expected gameName#tagLine".to_string(),
        ));
    }

    let lcu_shard = jax.get_shard::<LcuShard>();
    let network_config = lcu_shard
        .network_config()
        .ok_or_else(|| AppError::other("LCU network config is not initialized"))?;
    let manager = lcu_shard.manager().ok_or(AppError::LcuNotConnected)?;
    let session = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let lcu_api = session.api();
    let riot_client = RiotClientHttpClient::new(session.auth(), network_config)?;
    let sgp_shard = jax.get_shard::<SgpShard>();
    let sgp_session = session.to_sgp(&sgp_shard).await?;
    let sgp_api = sgp_session.api();
    let config = sgp_servers_config()?;
    let tencent_servers = tencent_server_set(config);
    let current_sgp_server_id =
        to_tencent_canonical_server_id(sgp_api.sgp_server_id(), &tencent_servers);
    let use_sgp_validation = is_tencent_server_id(&current_sgp_server_id, &tencent_servers);

    let aliases = riot_client
        .get_player_account_aliases(&game_name, Some(&tag_line))
        .await?;
    let results = search_aliases_with_target_server(
        aliases,
        &current_sgp_server_id,
        true,
        use_sgp_validation,
        lcu_api,
        sgp_api,
    )
    .await?;

    results
        .into_iter()
        .next()
        .ok_or_else(|| AppError::other("Summoner not found".to_string()))
}

#[tauri::command]
pub async fn search_summoners(
    query: String,
    sgp_server_id: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<SummonerSearchResult>, AppError> {
    let parsed_query = parse_summoner_search_query(&query)?;
    let lcu_shard = jax.get_shard::<LcuShard>();
    let network_config = lcu_shard
        .network_config()
        .ok_or_else(|| AppError::other("LCU network config is not initialized"))?;
    let manager = lcu_shard.manager().ok_or(AppError::LcuNotConnected)?;
    let session = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let lcu_api = session.api();
    let riot_client = RiotClientHttpClient::new(session.auth(), network_config)?;
    let sgp_shard = jax.get_shard::<SgpShard>();
    let sgp_session = session.to_sgp(&sgp_shard).await?;
    let sgp_api = sgp_session.api();
    let current_sgp_server_id = sgp_api.sgp_server_id();
    let config = sgp_servers_config()?;
    let tencent_servers = tencent_server_set(config);

    let target_sgp_server_id =
        resolve_target_sgp_server_id(current_sgp_server_id, sgp_server_id, config)?;
    let current_sgp_server_id_canonical =
        to_tencent_canonical_server_id(current_sgp_server_id, &tencent_servers);
    let same_server = target_sgp_server_id == current_sgp_server_id_canonical;
    let use_sgp_validation = is_tencent_server_id(&target_sgp_server_id, &tencent_servers);

    match parsed_query {
        ParsedSummonerSearchQuery::Puuid(puuid) => {
            let mut result = if use_sgp_validation || !same_server {
                let Some(summoner) = sgp_api
                    .get_summoner_by_puuid(&target_sgp_server_id, &puuid)
                    .await?
                else {
                    return Ok(Vec::new());
                };
                summoner_search_result(&summoner, &target_sgp_server_id, None, None)
            } else {
                let Some(summoner) = lcu_api.get_summoner_by_puuid_optional(&puuid).await? else {
                    return Ok(Vec::new());
                };
                summoner_search_result(&summoner, &target_sgp_server_id, None, None)
            };

            if let Some((game_name, tag_line)) =
                resolve_nameset_identity(&riot_client, &puuid).await
            {
                result.game_name = game_name;
                result.tag_line = tag_line;
            }

            Ok(vec![result])
        }
        ParsedSummonerSearchQuery::Exact {
            game_name,
            tag_line,
        } => {
            let aliases = riot_client
                .get_player_account_aliases(&game_name, Some(&tag_line))
                .await?;
            search_aliases_with_target_server(
                aliases,
                &target_sgp_server_id,
                same_server,
                use_sgp_validation,
                lcu_api,
                sgp_api,
            )
            .await
        }
        ParsedSummonerSearchQuery::Fuzzy { game_name } => {
            let aliases = riot_client
                .get_player_account_aliases(&game_name, None)
                .await?;
            search_aliases_with_target_server(
                aliases,
                &target_sgp_server_id,
                same_server,
                use_sgp_validation,
                lcu_api,
                sgp_api,
            )
            .await
        }
    }
}

#[tauri::command]
pub async fn get_summoner_by_puuid(
    puuid: String,
    sgp_server_id: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<SummonerInfo, AppError> {
    let lcu_shard = jax.get_shard::<LcuShard>();
    let manager = lcu_shard.manager().ok_or(AppError::LcuNotConnected)?;
    let session = manager.focused().await.ok_or(AppError::LcuNotConnected)?;

    if let Some(raw_sgp_server_id) = sgp_server_id {
        let requested = raw_sgp_server_id.trim();
        if !requested.is_empty() {
            let config = sgp_servers_config()?;
            let tencent_servers = tencent_server_set(config);
            let target_sgp_server_id = to_tencent_canonical_server_id(requested, &tencent_servers);

            if is_tencent_server_id(&target_sgp_server_id, &tencent_servers) {
                let sgp_shard = jax.get_shard::<SgpShard>();
                let sgp_session = session.to_sgp(&sgp_shard).await?;
                let Some(summoner) = sgp_session
                    .api()
                    .get_summoner_by_puuid(&target_sgp_server_id, &puuid)
                    .await?
                else {
                    return Err(AppError::other(format!(
                        "Summoner not found on server {target_sgp_server_id}: {puuid}"
                    )));
                };

                let mut summoner = summoner;
                let network_config = lcu_shard
                    .network_config()
                    .ok_or_else(|| AppError::other("LCU network config is not initialized"))?;
                let riot_client = RiotClientHttpClient::new(session.auth(), network_config)?;
                if let Some((game_name, tag_line)) =
                    resolve_nameset_identity(&riot_client, &puuid).await
                {
                    summoner.game_name = game_name;
                    summoner.tag_line = tag_line;
                }

                return Ok(summoner);
            }
        }
    }

    session.api().get_summoner_by_puuid(&puuid).await
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
    let cache_namespace = lcu_static_data_cache_namespace(&lcu).await?;
    jax.get_shard::<StaticCacheShard>()
        .get_json_file_or_init(&cache_namespace, LCU_CHERRY_AUGMENTS_CACHE_FILE, || {
            api.get_cherry_augments_json()
        })
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
    let focused_pid = manager
        .focused_pid()
        .await
        .ok_or(AppError::LcuNotConnected)?;
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

#[tauri::command]
pub async fn get_match_details(
    game_id: u64,
    sgp_server_id: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<RawMatchDetailsGame, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let focused_pid = manager
        .focused_pid()
        .await
        .ok_or(AppError::LcuNotConnected)?;
    let session = manager
        .session_for_pid(focused_pid)
        .ok_or(AppError::LcuNotConnected)?;
    let sgp_shard = jax.get_shard::<SgpShard>();
    let sgp_session = session.to_sgp(&sgp_shard).await?;

    sgp_session
        .api()
        .get_match_details(game_id, sgp_server_id.as_deref())
        .await
}
