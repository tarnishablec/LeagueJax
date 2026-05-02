use std::sync::Arc;

use crate::error::AppError;
use crate::shards::lcu::concepts::chat::{LcuChatFriend, LcuChatFriendGroup};
use crate::shards::lcu::LcuShard;
use jax::Jax;
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub async fn lcu_update_focus(pid: Option<u32>, jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    manager.update_focus(pid).await;
    Ok(())
}

#[tauri::command]
pub async fn lcu_get_game_version(jax: State<'_, Arc<Jax>>) -> Result<String, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    lcu.cache()
        .get_or_try_init("game_version", || lcu.api().get_game_version())
        .await
}

#[tauri::command]
pub async fn lcu_get_ranked_tiers(
    summoner_ids: Vec<i64>,
    queue_types: Vec<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Value, AppError> {
    let normalized_summoner_ids: Vec<i64> = summoner_ids.into_iter().filter(|id| *id > 0).collect();
    if normalized_summoner_ids.is_empty() {
        return Err(AppError::other(
            "lcu_get_ranked_tiers requires at least one valid summoner id",
        ));
    }

    let normalized_queue_types: Vec<String> = queue_types
        .into_iter()
        .map(|queue_type| queue_type.trim().to_string())
        .filter(|queue_type| !queue_type.is_empty())
        .collect();
    if normalized_queue_types.is_empty() {
        return Err(AppError::other(
            "lcu_get_ranked_tiers requires at least one queue type",
        ));
    }

    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    lcu.api()
        .get_ranked_tiers(&normalized_summoner_ids, &normalized_queue_types)
        .await
}

#[tauri::command]
pub async fn lcu_get_chat_friends(
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<LcuChatFriend>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    lcu.api().get_chat_friends().await
}

#[tauri::command]
pub async fn lcu_get_chat_friend_groups(
    jax: State<'_, Arc<Jax>>,
) -> Result<Vec<LcuChatFriendGroup>, AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    lcu.api().get_chat_friend_groups().await
}

#[tauri::command]
pub async fn lcu_champ_select_swap_bench_champion(
    champion_id: u64,
    jax: State<'_, Arc<Jax>>,
) -> Result<(), AppError> {
    if champion_id == 0 {
        return Err(AppError::other(
            "lcu_champ_select_swap_bench_champion requires a champion id",
        ));
    }

    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    lcu.api().swap_bench_champion(champion_id).await
}

#[tauri::command]
pub async fn lcu_champ_select_quit(jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;
    lcu.api().quit_champ_select().await
}
