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
pub async fn lcu_get_maps(jax: State<'_, Arc<Jax>>) -> Result<Vec<LcuMap>, AppError> {
    let lcu = jax.get_shard::<LcuShard>().focused().await?;
    let api = lcu.api();
    let version = lcu
        .cache()
        .get_or_try_init("game_version", || api.get_game_version())
        .await?;
    let region = lcu.auth().region.clone().unwrap_or_default();
    let cache_version = format!("{version}_{region}");
    jax.get_shard::<StaticCacheShard>()
        .get_or_init(LCU_CACHE, "lcu_maps", &cache_version, || api.get_maps())
        .await
}

#[tauri::command]
pub async fn lcu_get_queues(jax: State<'_, Arc<Jax>>) -> Result<Vec<LcuQueue>, AppError> {
    let lcu = jax.get_shard::<LcuShard>().focused().await?;
    let api = lcu.api();
    let version = lcu
        .cache()
        .get_or_try_init("game_version", || api.get_game_version())
        .await?;
    let region = lcu.auth().region.clone().unwrap_or_default();
    let cache_version = format!("{version}_{region}");
    jax.get_shard::<StaticCacheShard>()
        .get_or_init(LCU_CACHE, "lcu_queues", &cache_version, || api.get_queues())
        .await
}
