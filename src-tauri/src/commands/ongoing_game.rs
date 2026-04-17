use std::sync::Arc;

use jax::Jax;
use serde_json::Value;
use tauri::State;

use crate::error::AppError;
use crate::shards::ongoing_game::manager::MatchHistoryModeSetting;
use crate::shards::ongoing_game::types::OngoingGameInput;
use crate::shards::ongoing_game::OngoingGameShard;
use crate::shards::settings::SettingsShard;

const MATCH_HISTORY_COUNT_SETTING_ID: &str = "ongoing.behavior.matchHistoryCount";
const QUEUE_MODE_CURRENT_VALUE: &str = "__current_mode__";

#[tauri::command]
pub async fn ongoing_game_refresh(jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    if let Some(manager) = jax.get_shard::<OngoingGameShard>().manager() {
        manager.post(OngoingGameInput::Refresh);
    }
    Ok(())
}

#[tauri::command]
pub async fn ongoing_game_refresh_match_histories(
    jax: State<'_, Arc<Jax>>,
) -> Result<(), AppError> {
    if let Some(manager) = jax.get_shard::<OngoingGameShard>().manager() {
        manager.post(OngoingGameInput::RefreshMatchHistories);
    }
    Ok(())
}

#[tauri::command]
pub async fn ongoing_game_set_match_history_tag(
    tag: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<(), AppError> {
    let mode = match tag.as_deref().map(str::trim) {
        None | Some("") | Some("all") => MatchHistoryModeSetting::All,
        Some(QUEUE_MODE_CURRENT_VALUE) => MatchHistoryModeSetting::CurrentMode,
        Some(value) => MatchHistoryModeSetting::FixedTag(value.to_string()),
    };

    if let Some(manager) = jax.get_shard::<OngoingGameShard>().manager() {
        manager.post(OngoingGameInput::SetMatchHistoryMode(mode));
    }
    Ok(())
}

#[tauri::command]
pub async fn ongoing_game_set_match_history_count(
    count: u32,
    jax: State<'_, Arc<Jax>>,
) -> Result<(), AppError> {
    let settings = jax.get_shard::<SettingsShard>();
    let normalized = count.clamp(1, 200);
    settings.set_value(
        MATCH_HISTORY_COUNT_SETTING_ID,
        Value::Number(serde_json::Number::from(normalized)),
    )?;
    Ok(())
}
