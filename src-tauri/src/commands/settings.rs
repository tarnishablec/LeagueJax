use crate::error::AppError;
use crate::shards::settings::types::{
    SettingsBootstrapDto, SettingsChangedEventDto, SettingsSnapshotDto,
};
use crate::shards::settings::SettingsShard;
use jax::Jax;
use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::Arc;
use tauri::{Emitter, State};

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
    app: tauri::AppHandle,
) -> Result<SettingsSnapshotDto, AppError> {
    let settings = jax.get_shard::<SettingsShard>();
    let outcome = settings.set_value(&id, value)?;

    if !outcome.changes.is_empty() {
        let payload = SettingsChangedEventDto {
            changes: outcome.changes,
            source,
        };
        app.emit("settings_changed", payload)
            .map_err(|err| AppError::other(format!("Failed to emit settings event: {err}")))?;
    }

    Ok(outcome.snapshot)
}

#[tauri::command]
pub async fn set_settings_values(
    changes: BTreeMap<String, Value>,
    source: Option<String>,
    jax: State<'_, Arc<Jax>>,
    app: tauri::AppHandle,
) -> Result<SettingsSnapshotDto, AppError> {
    let settings = jax.get_shard::<SettingsShard>();
    let outcome = settings.set_values(changes)?;

    if !outcome.changes.is_empty() {
        let payload = SettingsChangedEventDto {
            changes: outcome.changes,
            source,
        };
        app.emit("settings_changed", payload)
            .map_err(|err| AppError::other(format!("Failed to emit settings event: {err}")))?;
    }

    Ok(outcome.snapshot)
}
