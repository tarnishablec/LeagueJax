use std::sync::Arc;

use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use jax::Jax;
use tauri::State;

#[tauri::command]
pub fn lcu_switch_focus(pid: u32, jax: State<Arc<Jax>>) {
    jax.get_shard::<LcuShard>().switch_focus(pid);
}

#[tauri::command]
pub fn lcu_unfocus(jax: tauri::State<Arc<Jax>>) {
    jax.get_shard::<LcuShard>().unfocus();
}

#[tauri::command]
pub async fn get_profile_icon(icon_id: i64, jax: State<'_, Arc<Jax>>) -> Result<Vec<u8>, AppError> {
    let client = jax
        .get_shard::<LcuShard>()
        .client()
        .ok_or(AppError::LcuNotConnected)?;
    let path = format!("/lol-game-data/assets/v1/profile-icons/{icon_id}.jpg");
    client.get_bytes(&path).await
}

#[tauri::command]
pub async fn get_game_version(jax: State<'_, Arc<Jax>>) -> Result<String, AppError> {
    let client = jax
        .get_shard::<LcuShard>()
        .client()
        .ok_or(AppError::LcuNotConnected)?;
    let resp = client.get("/lol-patch/v1/game-version").await?;
    let full = resp.as_str().unwrap_or_default();
    // CDragon uses "major.minor" format
    let version = full.split('.').take(2).collect::<Vec<_>>().join(".");
    Ok(version)
}
