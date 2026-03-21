use crate::concepts::maps::LcuMap;
use crate::concepts::queues::LcuQueue;
use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use crate::shards::static_cache::StaticCacheShard;
use jax::Jax;
use std::sync::Arc;
use tauri::State;

const LCU_CACHE: &str = "lcu-cache.json";

#[tauri::command]
pub async fn get_lcu_maps(jax: State<'_, Arc<Jax>>) -> Result<Vec<LcuMap>, AppError> {
    let lcu = jax.get_shard::<LcuShard>().focused().await?;
    let api = lcu.api();
    let version = api.get_game_version().await?;
    let cache = jax.get_shard::<StaticCacheShard>();

    if let Some(cached) = cache.get::<Vec<LcuMap>>(LCU_CACHE, "lcu_maps", &version) {
        return Ok(cached);
    }

    let data = api.get_maps().await?;
    cache.set(LCU_CACHE, "lcu_maps", &version, &data);
    Ok(data)
}

#[tauri::command]
pub async fn get_lcu_queues(jax: State<'_, Arc<Jax>>) -> Result<Vec<LcuQueue>, AppError> {
    let lcu = jax.get_shard::<LcuShard>().focused().await?;
    let api = lcu.api();
    let version = api.get_game_version().await?;
    let cache = jax.get_shard::<StaticCacheShard>();

    if let Some(cached) = cache.get::<Vec<LcuQueue>>(LCU_CACHE, "lcu_queues", &version) {
        return Ok(cached);
    }

    let data = api.get_queues().await?;
    cache.set(LCU_CACHE, "lcu_queues", &version, &data);
    Ok(data)
}
