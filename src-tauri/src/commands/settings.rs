use crate::error::AppError;
use crate::shards::settings::types::{SettingsBootstrapDto, SettingsSnapshotDto};
use crate::shards::settings::SettingsShard;
use jax::Jax;
use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn execute_setting_action(
    id: String,
    jax: State<'_, Arc<Jax>>,
) -> Result<Value, AppError> {
    let settings = jax.get_shard::<SettingsShard>();
    settings.invoke_action(&id).await
}

#[tauri::command]
pub async fn get_settings_bootstrap(
    jax: State<'_, Arc<Jax>>,
) -> Result<SettingsBootstrapDto, AppError> {
    let settings = jax.get_shard::<SettingsShard>();
    settings.get_bootstrap()
}

#[tauri::command]
pub async fn set_settings_value(
    id: String,
    value: Value,
    source: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<SettingsSnapshotDto, AppError> {
    let settings = jax.get_shard::<SettingsShard>();
    let outcome = settings.set_value_with_source(&id, value, source)?;
    Ok(outcome.snapshot)
}

#[tauri::command]
pub async fn set_settings_values(
    changes: BTreeMap<String, Value>,
    source: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<SettingsSnapshotDto, AppError> {
    let settings = jax.get_shard::<SettingsShard>();
    let outcome = settings.set_values_with_source(changes, source)?;
    Ok(outcome.snapshot)
}
