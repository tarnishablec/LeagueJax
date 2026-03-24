use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use jax::Jax;
use serde_json::Value;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn lcu_get_platform_config_namespaces(jax: State<'_, Arc<Jax>>) -> Result<Value, AppError> {
    let lcu = jax.get_shard::<LcuShard>().focused().await?;
    lcu.api().get_platform_config_namespaces().await
}


#[tauri::command]
pub async fn lcu_get_help(jax: State<'_, Arc<Jax>>) -> Result<Value, AppError> {
    let lcu = jax.get_shard::<LcuShard>().focused().await?;
    lcu.api().get_help().await
}