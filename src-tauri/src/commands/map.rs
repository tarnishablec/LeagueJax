use crate::error::AppError;
use crate::shards::cdragon_static_data::{
    cdragon_game_data_locale_path, cdragon_static_data_context, get_cached_cdragon_json,
    CDRAGON_RAW_ROOT,
};
use crate::shards::lcu::concepts::maps::LcuMap;
use crate::shards::lcu::concepts::queues::LcuQueue;
use crate::shards::lcu::LcuShard;
use jax::Jax;
use serde_json::Value;
use std::sync::Arc;
use tauri::State;

const CDRAGON_MAPS_CACHE_FILE: &str = "maps.json";
const CDRAGON_QUEUES_CACHE_FILE: &str = "queues.json";

#[tauri::command]
pub async fn lcu_get_maps(
    force_refresh: Option<bool>,
    locale: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<LcuMap>, AppError> {
    match get_cdragon_game_data_json(
        &jax,
        locale.as_deref().unwrap_or_default(),
        CDRAGON_MAPS_CACHE_FILE,
        force_refresh.unwrap_or(false),
    )
    .await
    {
        Ok(maps) => Ok(maps),
        Err(error) => {
            tracing::warn!(
                error = %error,
                "Failed to load CDragon maps; falling back to focused LCU"
            );
            focused_lcu_maps(&jax).await
        }
    }
}

#[tauri::command]
pub async fn lcu_get_queues(
    force_refresh: Option<bool>,
    locale: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<LcuQueue>, AppError> {
    match get_cdragon_game_data_json(
        &jax,
        locale.as_deref().unwrap_or_default(),
        CDRAGON_QUEUES_CACHE_FILE,
        force_refresh.unwrap_or(false),
    )
    .await
    {
        Ok(queues) => Ok(queues),
        Err(error) => {
            tracing::warn!(
                error = %error,
                "Failed to load CDragon queues; falling back to focused LCU"
            );
            focused_lcu_queues(&jax).await
        }
    }
}

async fn focused_lcu_maps(jax: &Arc<Jax>) -> Result<Vec<LcuMap>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    lcu.api().get_maps_json().await
}

async fn focused_lcu_queues(jax: &Arc<Jax>) -> Result<Vec<LcuQueue>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    lcu.api().get_queues_json().await
}

async fn get_cdragon_game_data_json<T>(
    jax: &Arc<Jax>,
    locale: &str,
    file_name: &str,
    force_refresh: bool,
) -> Result<T, AppError>
where
    T: serde::de::DeserializeOwned,
{
    let value = get_cdragon_game_data_value(jax, locale, file_name, force_refresh).await?;
    Ok(serde_json::from_value(value)?)
}

async fn get_cdragon_game_data_value(
    jax: &Arc<Jax>,
    locale: &str,
    file_name: &str,
    force_refresh: bool,
) -> Result<Value, AppError> {
    let context = cdragon_static_data_context(jax, locale).await?;
    let locale_path = cdragon_game_data_locale_path(&context.locale);
    let mut urls = vec![format!(
        "{}/{}/plugins/rcp-be-lol-game-data/global/{}/v1/{}",
        CDRAGON_RAW_ROOT, context.version, locale_path, file_name
    )];

    if locale_path != "en_gb" {
        urls.push(format!(
            "{}/{}/plugins/rcp-be-lol-game-data/global/en_gb/v1/{}",
            CDRAGON_RAW_ROOT, context.version, file_name
        ));
    }

    get_cached_cdragon_json(jax, &context.namespace, file_name, urls, force_refresh).await
}
