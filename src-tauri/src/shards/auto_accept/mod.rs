mod manager;
pub mod types;

use std::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use uuid::Uuid;

use crate::shards::lcu::LcuShard;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::SettingsShard;

pub use self::manager::AutoAcceptManager;
use self::types::{
    ACCEPT_DELAY_DEFAULT_SECONDS, ACCEPT_DELAY_MAX_SECONDS, ACCEPT_DELAY_MIN_SECONDS,
    ACCEPT_DELAY_SECONDS_SETTING_ID, AUTO_ACCEPT_DEFAULT, AUTO_ACCEPT_SETTING_ID,
};

pub struct AutoAcceptShard {
    manager: OnceLock<AutoAcceptManager>,
}

impl AutoAcceptShard {
    pub fn new() -> Self {
        Self {
            manager: OnceLock::new(),
        }
    }

    pub fn manager(&self) -> Option<AutoAcceptManager> {
        self.manager.get().cloned()
    }

    fn register_settings(
        &self,
        settings: &Arc<SettingsShard>,
    ) -> Result<(), crate::error::AppError> {
        let _enabled = settings.register_definition(SettingDefinitionDto {
            id: AUTO_ACCEPT_SETTING_ID.to_string(),
            label_key: "settings.matchmaking.autoAccept.label".to_string(),
            hint_key: Some("settings.matchmaking.autoAccept.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Toggle,
            default_value: Value::Bool(AUTO_ACCEPT_DEFAULT),
            order: Some(10),
            visible: Some(true),
            options: None,
        })?;

        let _accept_delay_seconds = settings.register_definition(SettingDefinitionDto {
            id: ACCEPT_DELAY_SECONDS_SETTING_ID.to_string(),
            label_key: "settings.matchmaking.acceptDelaySeconds.label".to_string(),
            hint_key: Some("settings.matchmaking.acceptDelaySeconds.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Number {
                placeholder_key: None,
                min: Some(ACCEPT_DELAY_MIN_SECONDS),
                max: Some(ACCEPT_DELAY_MAX_SECONDS),
                step: Some(1.0),
            },
            default_value: Value::from(ACCEPT_DELAY_DEFAULT_SECONDS),
            order: Some(20),
            visible: Some(true),
            options: None,
        })?;

        Ok(())
    }
}

#[async_trait]
impl Shard for AutoAcceptShard {
    shard_id!("7744b799-c21d-48df-9a9e-fbce77c58452");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings_shard = jax.get_shard::<SettingsShard>();
        let lcu_shard = jax.get_shard::<LcuShard>();

        self.register_settings(&settings_shard)?;

        let manager = AutoAcceptManager::new(lcu_shard);

        if self.manager.set(manager).is_err() {
            tracing::warn!("AutoAcceptShard manager already initialized");
        }

        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![SettingsShard, LcuShard]
    }
}
