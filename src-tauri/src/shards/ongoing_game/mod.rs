pub mod context;
pub mod driver;
pub mod manager;
pub mod types;

use std::error::Error;
use std::sync::{Arc, OnceLock};

use self::manager::{OngoingGameManager, OngoingGameSettings};
use crate::shards::lcu::LcuShard;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::SettingsShard;
use crate::shards::sgp::SgpShard;
use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use uuid::Uuid;

const MATCH_HISTORY_COUNT_SETTING_ID: &str = "ongoing.behavior.matchHistoryCount";
const MATCH_HISTORY_COUNT_DEFAULT: u32 = 50;

pub struct OngoingGameShard {
    manager: OnceLock<Arc<OngoingGameManager>>,
}

impl OngoingGameShard {
    pub fn new() -> Self {
        Self {
            manager: OnceLock::new(),
        }
    }

    pub fn manager(&self) -> Option<Arc<OngoingGameManager>> {
        self.manager.get().cloned()
    }

    pub fn initialize(
        &self,
        settings: OngoingGameSettings,
        sgp_shard: Arc<SgpShard>,
        lcu_shard: Arc<LcuShard>,
    ) -> Arc<OngoingGameManager> {
        if let Some(existing) = self.manager.get() {
            return existing.clone();
        }

        let manager = Arc::new(OngoingGameManager::new(settings, sgp_shard, lcu_shard));
        let _ = self.manager.set(manager.clone());
        manager
    }
}

#[async_trait]
impl Shard for OngoingGameShard {
    shard_id!("38121643-b79d-4382-9592-c647da511c1b");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let sgp_shard = jax.get_shard::<SgpShard>();
        let lcu_shard = jax.get_shard::<LcuShard>();

        let count_setting = settings.register_definition(SettingDefinitionDto {
            id: MATCH_HISTORY_COUNT_SETTING_ID.to_string(),
            label_key: "settings.ongoing.matchHistoryCount.label".to_string(),
            hint_key: None,
            scope: SettingScopeDto::Shared,
            control: SettingControlDto::Number {
                placeholder_key: None,
                min: Some(1.0),
                max: Some(200.0),
                step: Some(1.0),
            },
            default_value: Value::Number(serde_json::Number::from(MATCH_HISTORY_COUNT_DEFAULT)),
            order: Some(10),
            visible: Some(true),
            options: None,
        })?;

        let manager = self.initialize(
            OngoingGameSettings {
                match_history_count: count_setting.clone(),
            },
            sgp_shard,
            lcu_shard,
        );

        let count_manager = manager.clone();
        count_setting.spawn_watch(false, move |_| {
            let count_manager = count_manager.clone();
            async move { todo!() }
        })?;

        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![LcuShard, SgpShard, SettingsShard]
    }
}
