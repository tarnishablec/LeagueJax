pub mod behaviors;
pub mod context;
pub mod manager;
pub mod runtime;
pub mod tree;
pub mod types;

use std::error::Error;
use std::sync::{Arc, OnceLock};

use self::manager::{OngoingGameManager, OngoingGameSettings};
use self::types::OngoingGameInput;
use crate::shards::lcu::LcuShard;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::SettingsShard;
use crate::shards::sgp::SgpShard;
use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use uuid::Uuid;

const MATCH_HISTORY_COUNT_SETTING_ID: &str = "ongoing.interaction.matchHistoryCount";
const MATCH_HISTORY_COUNT_DEFAULT: u32 = 50;

pub struct OngoingGameShard {
    manager: OnceLock<OngoingGameManager>,
}

impl OngoingGameShard {
    pub fn new() -> Self {
        Self {
            manager: OnceLock::new(),
        }
    }

    pub fn manager(&self) -> Option<OngoingGameManager> {
        self.manager.get().cloned()
    }
}

#[async_trait]
impl Shard for OngoingGameShard {
    shard_id!("38121643-b79d-4382-9592-c647da511c1b");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings_shard = jax.get_shard::<SettingsShard>();
        let sgp_shard = jax.get_shard::<SgpShard>();
        let lcu_shard = jax.get_shard::<LcuShard>();

        let count_setting = settings_shard.register_definition(SettingDefinitionDto {
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

        let og_settings = OngoingGameSettings {
            match_history_count: count_setting.clone(),
        };

        let manager = OngoingGameManager::new(og_settings, sgp_shard, lcu_shard.clone());

        let manager_for_watch = manager.clone();
        count_setting.spawn_watch(false, move |_| {
            let mgr = manager_for_watch.clone();
            async move {
                mgr.post(OngoingGameInput::RefreshMatchHistories);
            }
        })?;

        let _ = self.manager.set(manager);

        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![LcuShard, SgpShard, SettingsShard]
    }
}
