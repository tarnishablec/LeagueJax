use crate::shards::settings::types::{
    SettingControlDto, SettingDefinitionDto, SettingOptionDto, SettingScopeDto,
};
use crate::shards::settings::SettingsShard;
use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use std::error::Error;
use std::sync::Arc;
use uuid::Uuid;

const LOG_LEVEL_SETTING_ID: &str = "system.logging.level";

pub struct LogShard;

impl LogShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for LogShard {
    shard_id!("3f0e1054-6541-40f9-9b4c-73550766168d");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let _log_level_setting = settings.register_definition(SettingDefinitionDto {
            id: LOG_LEVEL_SETTING_ID.to_string(),
            label_key: "settings.logging.level.label".to_string(),
            scope: SettingScopeDto::Shared,
            control: SettingControlDto::Select,
            default_value: Value::String("info".to_string()),
            order: Some(10),
            visible: Some(true),
            options: Some(vec![
                SettingOptionDto {
                    value: "debug".to_string(),
                    label_key: "settings.logging.levelDebug".to_string(),
                },
                SettingOptionDto {
                    value: "info".to_string(),
                    label_key: "settings.logging.levelInfo".to_string(),
                },
                SettingOptionDto {
                    value: "warn".to_string(),
                    label_key: "settings.logging.levelWarn".to_string(),
                },
                SettingOptionDto {
                    value: "error".to_string(),
                    label_key: "settings.logging.levelError".to_string(),
                },
            ]),
        })?;

        let level = settings
            .get_value(LOG_LEVEL_SETTING_ID)?
            .and_then(|value| value.as_str().map(|value| value.to_string()))
            .unwrap_or_else(|| "info".to_string());

        tracing::info!(
            setting_id = LOG_LEVEL_SETTING_ID,
            level,
            "Log level initialized"
        );
        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![SettingsShard]
    }
}

