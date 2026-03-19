use std::sync::Arc;

use crate::error::AppError;
use crate::shards::cdragon;
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
pub async fn get_profile_icon(icon_id: i64, jax: State<'_, Arc<Jax>>) -> Result<Vec<u8>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let client = manager
        .focused_client()
        .await
        .ok_or(AppError::LcuNotConnected)?;
    let path = format!("/lol-game-data/assets/v1/profile-icons/{icon_id}.jpg");
    client.get_bytes(&path).await
}

#[tauri::command]
pub async fn get_champion_icon(
    champion_id: i64,
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<u8>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let client = manager
        .focused_client()
        .await
        .ok_or(AppError::LcuNotConnected)?;
    let path = format!("/lol-game-data/assets/v1/champion-icons/{champion_id}.png");
    client.get_bytes(&path).await
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
    // CDragon uses "major.minor" format
    let version = full.split('.').take(2).collect::<Vec<_>>().join(".");
    Ok(version)
}

#[tauri::command]
pub async fn get_rank_icon(tier: String, jax: State<'_, Arc<Jax>>) -> Result<Vec<u8>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let client = manager
        .focused_client()
        .await
        .ok_or(AppError::LcuNotConnected)?;

    cdragon::fetch_rank_icon_bytes(&client, &tier).await
}
