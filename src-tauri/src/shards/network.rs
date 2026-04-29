use std::error::Error;
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;

use crate::error::AppError;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::SettingsShard;

const REQUEST_TIMEOUT_SETTING_ID: &str = "system.network.requestTimeoutSeconds";
const REQUEST_TIMEOUT_DEFAULT_SECONDS: u64 = 35;

#[derive(Clone)]
pub struct NetworkConfig {
    settings: Arc<SettingsShard>,
}

impl NetworkConfig {
    fn new(settings: Arc<SettingsShard>) -> Self {
        Self { settings }
    }

    pub fn request_timeout(&self) -> Duration {
        let seconds = self
            .settings
            .get_setting(REQUEST_TIMEOUT_SETTING_ID)
            .ok()
            .flatten()
            .and_then(|value| value.as_u64())
            .filter(|seconds| *seconds > 0)
            .unwrap_or(REQUEST_TIMEOUT_DEFAULT_SECONDS);

        Duration::from_secs(seconds)
    }
}

pub struct NetworkShard {
    config: OnceLock<Arc<NetworkConfig>>,
}

impl NetworkShard {
    pub fn new() -> Self {
        Self {
            config: OnceLock::new(),
        }
    }

    pub fn config(&self) -> Result<Arc<NetworkConfig>, AppError> {
        self.config
            .get()
            .cloned()
            .ok_or_else(|| AppError::other("Network config is not initialized"))
    }
}

impl Default for NetworkShard {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Shard for NetworkShard {
    shard_id!("8d1c4f62-9b35-4d6d-92c4-4ab530c0e1f6");
    depends![SettingsShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();

        settings.register_definition(SettingDefinitionDto {
            id: REQUEST_TIMEOUT_SETTING_ID.to_string(),
            label_key: "settings.network.requestTimeoutSeconds.label".to_string(),
            hint_key: None,
            scope: SettingScopeDto::Shared,
            control: SettingControlDto::Number {
                placeholder_key: None,
                min: Some(1.0),
                max: Some(300.0),
                step: Some(1.0),
            },
            default_value: Value::Number(serde_json::Number::from(REQUEST_TIMEOUT_DEFAULT_SECONDS)),
            order: Some(10),
            visible: Some(true),
            options: None,
        })?;

        if self
            .config
            .set(Arc::new(NetworkConfig::new(settings)))
            .is_err()
        {
            return Err(AppError::other("Network config is already initialized").into());
        }

        Ok(())
    }
}
