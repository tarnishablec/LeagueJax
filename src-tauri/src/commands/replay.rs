use std::sync::Arc;

use jax::Jax;
use tauri::State;

use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use crate::shards::replay::types::{ReplayLibrarySnapshot, ReplayMatchContext, ReplayMatchState};
use crate::shards::replay::ReplayShard;

#[tauri::command]
pub async fn replay_get_snapshot(
    jax: State<'_, Arc<Jax>>,
) -> Result<ReplayLibrarySnapshot, AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.snapshot(&lcu).await
}

#[tauri::command]
pub async fn replay_scan_folders(
    jax: State<'_, Arc<Jax>>,
) -> Result<ReplayLibrarySnapshot, AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.scan(&lcu).await
}

#[tauri::command]
pub async fn replay_add_folder(
    path: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<ReplayLibrarySnapshot, AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.add_folder(&lcu, path).await
}

#[tauri::command]
pub async fn replay_remove_folder(
    path: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<ReplayLibrarySnapshot, AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.remove_folder(&lcu, path).await
}

#[tauri::command]
pub async fn replay_open_folder(path: String, jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    jax.get_shard::<ReplayShard>().open_folder(path)
}

#[tauri::command]
pub async fn replay_reveal_entry(path: String, jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    jax.get_shard::<ReplayShard>().reveal_entry(path)
}

#[tauri::command]
pub async fn replay_prepare_match(
    context: ReplayMatchContext,
    jax: State<'_, Arc<Jax>>,
) -> Result<ReplayMatchState, AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.prepare_match(&lcu, context).await
}

#[tauri::command]
pub async fn replay_get_match_metadata(
    game_id: u64,
    jax: State<'_, Arc<Jax>>,
) -> Result<ReplayMatchState, AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.get_match_metadata(&lcu, game_id).await
}

#[tauri::command]
pub async fn replay_download_match(
    game_id: u64,
    jax: State<'_, Arc<Jax>>,
) -> Result<ReplayMatchState, AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.download_match(&lcu, game_id).await
}

#[tauri::command]
pub async fn replay_watch_match(game_id: u64, jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.watch_match(&lcu, game_id).await
}

#[tauri::command]
pub async fn replay_play_entry(path: String, jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.play_entry(&lcu, path).await
}
