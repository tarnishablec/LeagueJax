use std::sync::Arc;

use jax::Jax;
use serde_json::Value;

use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use crate::shards::network::{NetworkConfig, NetworkShard};
use crate::shards::static_cache::StaticCacheShard;

pub(crate) const CDRAGON_RAW_ROOT: &str = "https://raw.communitydragon.org";

pub(crate) struct CdragonStaticDataContext {
    pub(crate) version: String,
    pub(crate) locale: String,
    pub(crate) namespace: String,
}

pub(crate) fn normalize_cdragon_locale(locale: &str) -> String {
    let normalized = locale.trim().replace('-', "_").to_ascii_lowercase();
    if normalized.is_empty() {
        "en_us".to_string()
    } else {
        normalized
    }
}

pub(crate) fn cdragon_game_data_locale_path(locale: &str) -> String {
    let normalized = normalize_cdragon_locale(locale);
    if normalized == "default" || normalized == "en_us" {
        "en_gb".to_string()
    } else {
        normalized
    }
}

pub(crate) async fn cdragon_static_data_context(
    jax: &Arc<Jax>,
    locale: &str,
) -> Result<CdragonStaticDataContext, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let version = lcu
        .cache()
        .get_or_try_init("game_version", || lcu.api().get_game_version())
        .await?;
    let locale = normalize_cdragon_locale(locale);
    let namespace = format!(
        "{}__{}",
        normalize_static_cache_namespace_part(&version),
        normalize_static_cache_locale_part(&locale)
    );

    Ok(CdragonStaticDataContext {
        version,
        locale,
        namespace,
    })
}

pub(crate) async fn get_cached_cdragon_json(
    jax: &Arc<Jax>,
    cache_namespace: &str,
    file_name: &str,
    urls: Vec<String>,
    force_refresh: bool,
) -> Result<Value, AppError> {
    let network_config = jax.get_shard::<NetworkShard>().config()?;
    let static_cache = jax.get_shard::<StaticCacheShard>();

    if force_refresh {
        static_cache
            .get_json_file_or_init_with_options(cache_namespace, file_name, true, || {
                fetch_cdragon_json_from_urls(network_config, urls)
            })
            .await
    } else {
        static_cache
            .get_json_file_or_init(cache_namespace, file_name, || {
                fetch_cdragon_json_from_urls(network_config, urls)
            })
            .await
    }
}

async fn fetch_cdragon_json_from_urls(
    network_config: Arc<NetworkConfig>,
    urls: Vec<String>,
) -> Result<Value, AppError> {
    let mut last_failure = String::new();

    for url in urls {
        let response = network_config
            .external_http_client()
            .get(&url)
            .timeout(network_config.request_timeout())
            .send()
            .await?;

        if response.status().is_success() {
            return Ok(response.json::<Value>().await?);
        }

        last_failure = format!("{url} returned {}", response.status());
    }

    Err(AppError::other(format!(
        "CDragon request failed: {last_failure}"
    )))
}

fn normalize_static_cache_namespace_part(value: &str) -> String {
    let normalized = value.trim();
    if normalized.is_empty() {
        "unknown".to_string()
    } else {
        normalized.to_string()
    }
}

fn normalize_static_cache_locale_part(locale: &str) -> String {
    let normalized = normalize_cdragon_locale(locale);
    let mut parts = normalized.split('_');
    let Some(language) = parts.next() else {
        return "unknown".to_string();
    };
    let Some(region) = parts.next() else {
        return normalize_static_cache_namespace_part(&normalized);
    };

    if parts.next().is_some() || language.is_empty() || region.is_empty() {
        return normalize_static_cache_namespace_part(&normalized);
    }

    format!("{}_{}", language, region.to_ascii_uppercase())
}
