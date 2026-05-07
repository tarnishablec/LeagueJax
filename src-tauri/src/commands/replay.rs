use std::sync::Arc;

use jax::Jax;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::{DialogExt, FilePath};

use crate::error::AppError;
use crate::shards::lcu::LcuShard;
use crate::shards::replay::types::{
    ReplayExecutableTarget, ReplayLibrarySnapshot, ReplayMatchContext, ReplayMatchState,
};
use crate::shards::replay::ReplayShard;
use crate::shards::tauri_host::{RevealPathResult, TauriHost};

fn dialog_folder_path_to_string(folder: FilePath) -> Result<String, AppError> {
    match folder {
        FilePath::Path(path) => Ok(path.to_string_lossy().to_string()),
        FilePath::Url(url) => url
            .to_file_path()
            .map(|path| path.to_string_lossy().to_string())
            .map_err(|_| AppError::other("Selected replay folder path is not a local path")),
    }
}

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
pub async fn replay_pick_folder(
    app: AppHandle,
    jax: State<'_, Arc<Jax>>,
) -> Result<Option<ReplayLibrarySnapshot>, AppError> {
    let Some(folder) = app.dialog().file().blocking_pick_folder() else {
        return Ok(None);
    };
    let path = dialog_folder_path_to_string(folder)?;
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.add_folder(&lcu, path).await.map(Some)
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
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    replay.open_folder(&lcu, path).await
}

#[tauri::command]
pub async fn replay_reveal_entry(
    path: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<RevealPathResult, AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    let host = jax.get_shard::<TauriHost>();
    Ok(replay.reveal_entry(&lcu, &host, path).await)
}

#[tauri::command]
pub async fn replay_reveal_executable(
    target: ReplayExecutableTarget,
    jax: State<'_, Arc<Jax>>,
) -> Result<RevealPathResult, AppError> {
    let replay = jax.get_shard::<ReplayShard>();
    let lcu = jax.get_shard::<LcuShard>();
    let host = jax.get_shard::<TauriHost>();
    Ok(replay.reveal_executable(&lcu, &host, target).await)
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
