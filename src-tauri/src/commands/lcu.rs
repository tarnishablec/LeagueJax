use std::sync::Arc;

use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use jax::Jax;
use tauri::State;

#[tauri::command]
pub async fn lcu_update_focus(
    pid: Option<u32>,
    jax: State<'_, Arc<Jax>>,
) -> Result<(), AppError> {
    let Some(manager) = jax.get_shard::<LcuShard>().manager() else {
        return Err(AppError::LcuNotConnected);
    };
    manager.update_focus(pid).await;
    Ok(())
}

#[tauri::command]
pub async fn get_game_version(jax: State<'_, Arc<Jax>>) -> Result<String, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let client = manager
        .focused_client()
        .await
        .ok_or(AppError::LcuNotConnected)?;
    let resp = client.get("/lol-patch/v1/game-version").await?;
    let full = resp.as_str().unwrap_or_default();
    let version = full.split('.').take(2).collect::<Vec<_>>().join(".");
    Ok(version)
}
