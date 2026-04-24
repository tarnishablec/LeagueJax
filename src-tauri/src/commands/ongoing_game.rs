use std::sync::Arc;

use jax::Jax;
use serde_json::Value;
use tauri::State;

use crate::error::AppError;
use crate::shards::ongoing_game::manager::MatchHistoryModeSetting;
use crate::shards::ongoing_game::types::{OngoingGameInput, OngoingGameUpdated};
use crate::shards::ongoing_game::OngoingGameShard;
use crate::shards::settings::SettingsShard;

const MATCH_HISTORY_COUNT_SETTING_ID: &str = "ongoing.interaction.matchHistoryCount";
const QUEUE_MODE_CURRENT_VALUE: &str = "__current_mode__";

#[tauri::command]
pub async fn ongoing_game_refresh(jax: State<'_, Arc<Jax>>) -> Result<(), AppError> {
    if let Some(manager) = jax.get_shard::<OngoingGameShard>().manager() {
        manager.post(OngoingGameInput::Refresh);
    }
    Ok(())
}

#[tauri::command]
pub async fn ongoing_game_get_snapshot(
    jax: State<'_, Arc<Jax>>,
) -> Result<OngoingGameUpdated, AppError> {
    Ok(jax
        .get_shard::<OngoingGameShard>()
        .manager()
        .map(|manager| manager.snapshot())
        .unwrap_or(OngoingGameUpdated {
            phase: crate::shards::ongoing_game::types::OngoingGamePhase::Idle,
            lifecycle_game_id: None,
            match_history_tag: None,
            effective_queue_id: None,
            effective_mode_tag: None,
            match_histories_pending: false,
            summoner_states: Vec::new(),
            history_states: Vec::new(),
            gameflow_session: None,
            matchmaking_search: None,
            ready_check: None,
            champ_select_session: None,
            team_members: Vec::new(),
        }))
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
