use crate::error::AppError;
use crate::shards::lcu::concepts::maps::LcuMap;
use crate::shards::lcu::concepts::queues::LcuQueue;
use crate::shards::lcu::static_data_cache::{
    lcu_static_data_cache_namespace, LCU_MAPS_CACHE_FILE, LCU_QUEUES_CACHE_FILE,
};
use crate::shards::lcu::LcuShard;
use crate::shards::static_cache::StaticCacheShard;
use jax::Jax;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn lcu_get_maps(jax: State<'_, Arc<Jax>>) -> Result<Vec<LcuMap>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let api = lcu.api();
    let cache_namespace = lcu_static_data_cache_namespace(&lcu).await?;
    jax.get_shard::<StaticCacheShard>()
        .get_json_file_or_init(&cache_namespace, LCU_MAPS_CACHE_FILE, || {
            api.get_maps_json()
        })
        .await
}

#[tauri::command]
pub async fn lcu_get_queues(jax: State<'_, Arc<Jax>>) -> Result<Vec<LcuQueue>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    let api = lcu.api();
    let cache_namespace = lcu_static_data_cache_namespace(&lcu).await?;
    jax.get_shard::<StaticCacheShard>()
        .get_json_file_or_init(&cache_namespace, LCU_QUEUES_CACHE_FILE, || {
            api.get_queues_json()
        })
        .await
}
