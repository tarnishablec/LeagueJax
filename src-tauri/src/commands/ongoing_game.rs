use std::sync::Arc;

use jax::Jax;
use tauri::State;

use crate::error::AppError;
use crate::shards::ongoing_game::types::OngoingGameMatchHistoryFilter;
use crate::shards::ongoing_game::OngoingGameShard;

#[tauri::command]
pub async fn ongoing_game_refresh(jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    let Some(manager) = jax.get_shard::<OngoingGameShard>().manager() else {
        return Ok(());
    };
    manager.refresh_current().await;
    Ok(())
}

#[tauri::command]
pub async fn ongoing_game_set_match_history_filter(
    filter: OngoingGameMatchHistoryFilter,
    jax: State<'_, Arc<Jax>>,
) -> Result<(), AppError> {
    let Some(manager) = jax.get_shard::<OngoingGameShard>().manager() else {
        return Ok(());
    };
    manager.set_match_history_filter(filter).await;
    Ok(())
}
