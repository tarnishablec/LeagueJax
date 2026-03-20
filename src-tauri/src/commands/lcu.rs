use std::sync::Arc;

use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use jax::Jax;
use tauri::State;

#[tauri::command]
pub async fn lcu_update_focus(pid: Option<u32>, jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    jax.get_shard::<LcuShard>().update_focus(pid).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_game_version(jax: State<'_, Arc<Jax>>) -> Result<String, AppError> {
    jax.get_shard::<LcuShard>()
        .focused()
        .await?
        .api()
        .get_game_version()
        .await
}
