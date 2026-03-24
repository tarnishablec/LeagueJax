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
pub async fn lcu_get_game_version(jax: State<'_, Arc<Jax>>) -> Result<String, AppError> {
    let lcu = jax.get_shard::<LcuShard>().focused().await?;
    lcu.cache()
        .get_or_try_init("game_version", || lcu.api().get_game_version())
        .await
}
