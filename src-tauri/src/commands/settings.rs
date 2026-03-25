use crate::shards::settings::types::{
    SettingsBootstrapDto, SettingsChangedEventDto, SettingsPatchDto, SettingsPatchResultDto,
};
use crate::error::AppError;
use crate::shards::settings::SettingsShard;
use jax::Jax;
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
pub async fn apply_settings_patch(
    patch: SettingsPatchDto,
    jax: State<'_, Arc<Jax>>,
    app: tauri::AppHandle,
) -> Result<SettingsPatchResultDto, AppError> {
    let settings = jax.get_shard::<SettingsShard>();
    let outcome = settings.apply_patch(&patch)?;

    if !outcome.changes.is_empty() {
        let payload = SettingsChangedEventDto {
            changes: outcome.changes,
            version: outcome.snapshot.version,
            source: patch.source,
        };
        app.emit("settings_changed", payload)
            .map_err(|err| AppError::other(format!("Failed to emit settings event: {err}")))?;
    }

    Ok(SettingsPatchResultDto {
        snapshot: outcome.snapshot,
    })
}
