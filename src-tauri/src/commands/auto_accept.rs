use std::sync::Arc;

use jax::Jax;
use tauri::State;

use crate::error::AppError;
use crate::shards::auto_accept::AutoAcceptShard;

#[tauri::command]
pub async fn auto_accept_accept_ready_check(jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    let manager = jax
        .get_shard::<AutoAcceptShard>()
        .manager()
        .ok_or_else(|| AppError::other("AutoAccept manager not initialized"))?;

    manager.accept_ready_check_for_focused().await
}
