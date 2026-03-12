use std::sync::Arc;

use tauri::State;

use crate::error::{AppError, Result};
use crate::jax::Jax;
use crate::shards::lcu::LcuShard;

#[tauri::command]
pub async fn get_profile_icon(icon_id: i64, jax: State<'_, Arc<Jax>>) -> Result<Vec<u8>> {
    let client = jax
        .get_shard::<LcuShard>()
        .client()
        .ok_or(AppError::LcuNotConnected)?;
    let path = format!("/lol-game-data/assets/v1/profile-icons/{icon_id}.jpg");
    client.get_bytes(&path).await
}
