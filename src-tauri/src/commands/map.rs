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
    let region = lcu.auth_region().unwrap_or_default();
    let cache_version = format!("{version}_{region}");
    jax.get_shard::<StaticCacheShard>()
        .get_or_init(LCU_CACHE, "lcu_maps", &cache_version, || api.get_maps())
        .await
}

#[tauri::command]
pub async fn get_lcu_queues(jax: State<'_, Arc<Jax>>) -> Result<Vec<LcuQueue>, AppError> {
    let lcu = jax.get_shard::<LcuShard>().focused().await?;
    let api = lcu.api();
    let version = api.get_game_version().await?;
    let region = lcu.auth_region().unwrap_or_default();
    let cache_version = format!("{version}_{region}");
    jax.get_shard::<StaticCacheShard>()
        .get_or_init(LCU_CACHE, "lcu_queues", &cache_version, || {
            api.get_queues()
        })
        .await
}
