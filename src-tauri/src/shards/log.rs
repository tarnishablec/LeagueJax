use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::SettingsShard;
use crate::shards::tauri_host::TauriHost;
use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use std::error::Error;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::sync::OnceLock;
use tauri::Manager;
use uuid::Uuid;

const DETAILED_MODE_SETTING_ID: &str = "system.logging.detailedMode";
const OPEN_DIR_SETTING_ID: &str = "system.logging.openDir";
const CLEAN_LOGS_SETTING_ID: &str = "system.logging.cleanLogs";
static STARTUP_LOG_ID: OnceLock<Uuid> = OnceLock::new();

pub struct LogShard;

impl LogShard {
    pub fn new() -> Self {
        Self
    }

    pub fn current_log_id() -> Uuid {
        *STARTUP_LOG_ID.get_or_init(Uuid::now_v7)
    }

    pub fn current_log_filename() -> String {
        format!("league-jax.{}.log", Self::current_log_id())
    }
}

#[async_trait]
impl Shard for LogShard {
    shard_id!("3f0e1054-6541-40f9-9b4c-73550766168d");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let tauri_host = jax.get_shard::<TauriHost>();

        settings.register_definition(SettingDefinitionDto {
            id: DETAILED_MODE_SETTING_ID.to_string(),
            label_key: "settings.logging.detailedMode.label".to_string(),
            hint_key: Some("settings.logging.detailedMode.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Toggle,
            default_value: Value::Bool(false),
            order: Some(10),
            visible: Some(true),
            options: None,
        })?;

        let app = tauri_host.app.clone();
        settings.register_action(
            SettingDefinitionDto {
                id: OPEN_DIR_SETTING_ID.to_string(),
                label_key: "settings.logging.openDir.label".to_string(),
                hint_key: None,
                scope: SettingScopeDto::Backend,
                control: SettingControlDto::Action,
                default_value: Value::Null,
                order: Some(20),
                visible: Some(true),
                options: None,
            },
            move || {
                let log_dir = app
                    .path()
                    .app_data_dir()
                    .map_err(|e| crate::error::AppError::other(e.to_string()))?
                    .join("logs");

                if !log_dir.exists() {
                    fs::create_dir_all(&log_dir)?;
                }

                tauri_plugin_opener::reveal_item_in_dir(&log_dir).map_err(|e| {
                    crate::error::AppError::other(format!("Failed to open log directory: {e}"))
                })?;

                Ok(Value::Null)
            },
        )?;

        let app = tauri_host.app.clone();
        settings.register_action(
            SettingDefinitionDto {
                id: CLEAN_LOGS_SETTING_ID.to_string(),
                label_key: "settings.logging.cleanLogs.label".to_string(),
                hint_key: None,
                scope: SettingScopeDto::Backend,
                control: SettingControlDto::Action,
                default_value: Value::Null,
                order: Some(30),
                visible: Some(true),
                options: None,
            },
            move || {
                let log_dir = app
                    .path()
                    .app_data_dir()
                    .map_err(|e| crate::error::AppError::other(e.to_string()))?
                    .join("logs");

                if !log_dir.exists() {
                    return Ok(Value::from(0u32));
                }

                let active_log_file = log_dir.join(LogShard::current_log_filename());
                let removed = clean_log_dir(&log_dir, &active_log_file)?;
                tracing::info!(removed, "Cleaned all log files");
                Ok(Value::from(removed))
            },
        )?;

        let detailed = settings
            .get_value(DETAILED_MODE_SETTING_ID)?
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        tracing::info!(detailed_mode = detailed, "Log shard initialized");

        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![SettingsShard, TauriHost]
    }
}

fn clean_log_dir(dir: &Path, active_log_file: &Path) -> Result<u32, std::io::Error> {
    let mut cleaned = 0u32;

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            cleaned += clean_log_dir(&path, active_log_file)?;
            continue;
        }

        if path.is_file() {
            if path == active_log_file {
                continue;
            }
            if fs::remove_file(&path).is_err() {
                // If a file cannot be removed (e.g., external lock), truncate it.
                fs::write(&path, b"")?;
            }
            cleaned += 1;
        }
    }

    Ok(cleaned)
}
