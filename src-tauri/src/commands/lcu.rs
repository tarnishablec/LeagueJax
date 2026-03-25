use std::sync::Arc;

use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use jax::Jax;
use tauri::State;

#[tauri::command]
pub async fn lcu_update_focus(pid: Option<u32>, jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    manager.update_focus(pid).await;
    Ok(())
}

#[tauri::command]
pub async fn lcu_get_game_version(jax: State<'_, Arc<Jax>>) -> Result<String, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    lcu.cache()
        .get_or_try_init("game_version", || lcu.api().get_game_version())
        .await
}
