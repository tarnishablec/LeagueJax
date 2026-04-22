use std::sync::Arc;

use jax::Jax;
use tauri::State;

use crate::error::AppError;
use crate::shards::updater::UpdaterShard;
use crate::shards::updater::UpdaterStateDto;

#[tauri::command]
pub async fn get_updater_state(jax: State<'_, Arc<Jax>>) -> Result<UpdaterStateDto, AppError> {
    let updater = jax.get_shard::<UpdaterShard>();
    Ok(updater.get_state().await)
}

#[tauri::command]
pub async fn run_updater_action(jax: State<'_, Arc<Jax>>) -> Result<UpdaterStateDto, AppError> {
    let updater = jax.get_shard::<UpdaterShard>();
    updater.run_action().await
}
