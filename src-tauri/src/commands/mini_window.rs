use std::sync::Arc;

use jax::Jax;
use serde_json::Value;
use tauri::State;

use crate::error::AppError;
use crate::shards::mini_window::MiniWindowShard;

#[tauri::command]
pub async fn toggle_mini_window(jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    jax.get_shard::<MiniWindowShard>().toggle().await
}

#[tauri::command]
pub async fn set_mini_pin(enabled: bool, jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    jax.get_shard::<MiniWindowShard>()
        .set_pin_value(Value::Bool(enabled))
        .await
}
