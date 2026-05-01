use crate::shards::settings::types::{
    SettingControlDto, SettingDefinitionDto, SettingOptionDto, SettingScopeDto,
};
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
use time::{Duration, OffsetDateTime, UtcOffset};
use uuid::Uuid;

const RECORD_TO_FILE_SETTING_ID: &str = "system.logging.recordToFile";
const LEVEL_SETTING_ID: &str = "system.logging.level";
const RETENTION_DAYS_SETTING_ID: &str = "system.logging.retentionDays";
const OPEN_DIR_SETTING_ID: &str = "system.logging.openDir";
const CLEAN_LOGS_SETTING_ID: &str = "system.logging.cleanLogs";
const LOG_FILE_PREFIX: &str = "league-jax.";
const LOG_FILE_SUFFIX: &str = ".log";
const DEFAULT_RETENTION_DAYS: i64 = 7;
const MIN_RETENTION_DAYS: i64 = 1;
const MAX_RETENTION_DAYS: i64 = 7;
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

    pub fn default_record_to_file() -> bool {
        cfg!(debug_assertions)
    }

    pub fn default_retention_days() -> i64 {
        DEFAULT_RETENTION_DAYS
    }

    pub fn default_level() -> &'static str {
        "info"
    }

    fn sanitize_level(value: Option<&Value>) -> &'static str {
        match value.and_then(Value::as_str) {
            Some("error") => "error",
            Some("warn") => "warn",
            Some("debug") => "debug",
            Some("trace") => "trace",
            _ => Self::default_level(),
        }
    }

    fn level_options() -> Vec<SettingOptionDto> {
        ["error", "warn", "info", "debug", "trace"]
            .into_iter()
            .map(|level| SettingOptionDto {
                value: level.to_string(),
                label_key: format!("settings.logging.level.options.{level}"),
                display_label: None,
            })
            .collect()
    }

    fn sanitize_retention_days(value: Option<&Value>) -> i64 {
        value
            .and_then(|v| v.as_i64().or_else(|| v.as_f64().map(|n| n.round() as i64)))
            .unwrap_or_else(Self::default_retention_days)
            .clamp(MIN_RETENTION_DAYS, MAX_RETENTION_DAYS)
    }
}

#[async_trait]
impl Shard for LogShard {
    shard_id!("3f0e1054-6541-40f9-9b4c-73550766168d");
    depends![SettingsShard, TauriHost];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let tauri_host = jax.get_shard::<TauriHost>();

        let record_to_file_handle = settings.register_definition(SettingDefinitionDto {
            id: RECORD_TO_FILE_SETTING_ID.to_string(),
            label_key: "settings.logging.recordToFile.label".to_string(),
            hint_key: Some("settings.logging.recordToFile.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Toggle,
            default_value: Value::Bool(Self::default_record_to_file()),
            order: Some(10),
            visible: Some(true),
            options: None,
        })?;

        let level_handle = settings.register_definition(SettingDefinitionDto {
            id: LEVEL_SETTING_ID.to_string(),
            label_key: "settings.logging.level.label".to_string(),
            hint_key: Some("settings.logging.level.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Select,
            default_value: Value::from(Self::default_level()),
            order: Some(12),
            visible: Some(true),
            options: Some(Self::level_options()),
        })?;

        let retention_days_handle = settings.register_definition(SettingDefinitionDto {
            id: RETENTION_DAYS_SETTING_ID.to_string(),
            label_key: "settings.logging.retentionDays.label".to_string(),
            hint_key: Some("settings.logging.retentionDays.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Number {
                placeholder_key: None,
                min: Some(MIN_RETENTION_DAYS as f64),
                max: Some(MAX_RETENTION_DAYS as f64),
                step: Some(1.0),
            },
            default_value: Value::from(Self::default_retention_days()),
            order: Some(15),
            visible: Some(true),
            options: None,
        })?;

        let tracing_state = tauri_host.app.state::<crate::TracingState>();
        let file_logging = tracing_state.file_logging_handle();
        let log_level_filter = tracing_state.log_level_filter_handle();
        let log_level_setting = Self::sanitize_level(Some(&level_handle.get_value()?));
        log_level_filter
            .set_level(log_level_setting)
            .map_err(crate::error::AppError::other)?;

        let app = tauri_host.app.clone();
        let file_logging_for_action = file_logging.clone();
        let settings_for_action = Arc::clone(&settings);
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
                let app = app.clone();
                async move {
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
                }
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
                let app = app.clone();
                let file_logging_for_action = file_logging_for_action.clone();
                let settings_for_action = Arc::clone(&settings_for_action);
                async move {
                    let log_dir = app
                        .path()
                        .app_data_dir()
                        .map_err(|e| crate::error::AppError::other(e.to_string()))?
                        .join("logs");

                    if !log_dir.exists() {
                        return Ok(Value::from(0u32));
                    }

                    let active_log_file = log_dir.join(LogShard::current_log_filename());
                    let record_to_file = settings_for_action
                        .get_value(RECORD_TO_FILE_SETTING_ID)?
                        .and_then(|v| v.as_bool())
                        .unwrap_or_else(LogShard::default_record_to_file);

                    file_logging_for_action.disable();
                    let removed = clear_log_dir(&log_dir, &active_log_file)?;
                    if record_to_file {
                        file_logging_for_action
                            .enable(&log_dir, &LogShard::current_log_filename())
                            .map_err(crate::error::AppError::from)?;
                    }

                    tracing::info!(removed, "Cleared log files");
                    Ok(Value::from(removed))
                }
            },
        )?;

        let log_dir = tauri_host
            .app
            .path()
            .app_data_dir()
            .map_err(|e| crate::error::AppError::other(e.to_string()))?
            .join("logs");
        fs::create_dir_all(&log_dir)?;

        let active_log_file = log_dir.join(Self::current_log_filename());
        let retention_days =
            Self::sanitize_retention_days(Some(&retention_days_handle.get_value()?));
        let removed_expired = clean_expired_logs(&log_dir, &active_log_file, retention_days)?;
        if removed_expired > 0 {
            tracing::info!(
                removed = removed_expired,
                retention_days,
                "Cleaned expired log files"
            );
        }

        let record_to_file_setting = record_to_file_handle
            .get_value()?
            .as_bool()
            .unwrap_or_else(Self::default_record_to_file);
        if record_to_file_setting {
            file_logging.enable(&log_dir, &Self::current_log_filename())?;
        } else {
            file_logging.disable();
        }

        let app_for_watch = tauri_host.app.clone();
        let file_logging_for_watch = file_logging.clone();
        record_to_file_handle.spawn_watch(false, move |value| {
            let app = app_for_watch.clone();
            let file_logging = file_logging_for_watch.clone();
            async move {
                let record_to_file = value
                    .as_bool()
                    .unwrap_or_else(LogShard::default_record_to_file);
                let log_dir = match app.path().app_data_dir() {
                    Ok(dir) => dir.join("logs"),
                    Err(error) => {
                        tracing::error!(error = %error, "Failed to resolve log directory");
                        return;
                    }
                };

                let result = if record_to_file {
                    file_logging.enable(&log_dir, &LogShard::current_log_filename())
                } else {
                    file_logging.disable();
                    Ok(())
                };

                if let Err(error) = result {
                    tracing::error!(error = %error, record_to_file, "Failed to update file logging");
                } else {
                    tracing::info!(record_to_file, "Updated file logging");
                }
            }
        })?;

        let log_level_filter_for_watch = log_level_filter.clone();
        level_handle.spawn_watch(false, move |value| {
            let log_level_filter = log_level_filter_for_watch.clone();
            async move {
                let log_level = LogShard::sanitize_level(Some(&value));
                if let Err(error) = log_level_filter.set_level(log_level) {
                    tracing::error!(error = %error, log_level, "Failed to update log level");
                } else {
                    tracing::info!(log_level, "Updated log level");
                }
            }
        })?;

        tracing::info!(
            record_to_file_setting,
            record_to_file_effective = record_to_file_setting,
            log_level = log_level_setting,
            retention_days,
            "Log shard initialized"
        );

        Ok(())
    }
}

fn clear_log_dir(dir: &Path, active_log_file: &Path) -> Result<u32, std::io::Error> {
    let mut cleaned = 0u32;

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            cleaned += clear_log_dir(&path, active_log_file)?;
            continue;
        }

        if path.is_file() {
            if path == active_log_file {
                fs::write(&path, b"")?;
                cleaned += 1;
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

fn clean_expired_logs(
    dir: &Path,
    active_log_file: &Path,
    retention_days: i64,
) -> Result<u32, std::io::Error> {
    let now = OffsetDateTime::now_local().unwrap_or_else(|_| OffsetDateTime::now_utc());
    let local_offset = UtcOffset::current_local_offset().unwrap_or(UtcOffset::UTC);
    let cutoff = now.to_offset(local_offset) - Duration::days(retention_days);
    let mut cleaned = 0u32;

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            cleaned += clean_expired_logs(&path, active_log_file, retention_days)?;
            continue;
        }

        if !path.is_file() || path == active_log_file {
            continue;
        }

        let Some(created_at) = parse_log_created_at_from_filename(&path, local_offset) else {
            continue;
        };

        if created_at >= cutoff {
            continue;
        }

        if fs::remove_file(&path).is_err() {
            fs::write(&path, b"")?;
        }
        cleaned += 1;
    }

    Ok(cleaned)
}

fn parse_log_created_at_from_filename(
    path: &Path,
    local_offset: UtcOffset,
) -> Option<OffsetDateTime> {
    let file_name = path.file_name()?.to_str()?;
    let uuid_str = file_name
        .strip_prefix(LOG_FILE_PREFIX)?
        .strip_suffix(LOG_FILE_SUFFIX)?;
    let uuid = Uuid::parse_str(uuid_str).ok()?;
    let timestamp = uuid.get_timestamp()?;
    let (seconds, nanos) = timestamp.to_unix();
    let seconds = i64::try_from(seconds).ok()?;
    let created_at = OffsetDateTime::from_unix_timestamp(seconds).ok()?;
    let created_at = created_at.replace_nanosecond(nanos).ok()?;
    Some(created_at.to_offset(local_offset))
}
