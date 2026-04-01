pub mod driver;
pub mod manager;
pub mod types;

use std::error::Error;
use std::sync::{Arc, OnceLock};

use self::manager::{OngoingGameManager, OngoingGameManagerSettings};
use crate::shards::lcu::session::LcuSession;
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
const QUEUE_MODE_SETTING_ID: &str = "ongoing.behavior.queueMode";
const QUEUE_MODE_ALL_VALUE: &str = "__all__";

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
        settings: OngoingGameManagerSettings,
        sgp_shard: Arc<SgpShard>,
    ) -> Arc<OngoingGameManager> {
        if let Some(existing) = self.manager.get() {
            return existing.clone();
        }

        let manager = Arc::new(OngoingGameManager::new(settings, sgp_shard));
        let _ = self.manager.set(manager.clone());
        manager
    }

    pub async fn apply_focus(&self, lcu_session: Option<Arc<LcuSession>>) {
        let Some(manager) = self.manager() else {
            return;
        };

        if manager.has_same_lcu_focus(lcu_session.as_ref()).await {
            return;
        }

        manager.handle_focus_changed(lcu_session).await;
    }
}

#[async_trait]
impl Shard for OngoingGameShard {
    shard_id!("38121643-b79d-4382-9592-c647da511c1b");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let sgp_shard = jax.get_shard::<SgpShard>();

        let count_setting = settings.register_definition(SettingDefinitionDto {
            id: MATCH_HISTORY_COUNT_SETTING_ID.to_string(),
            label_key: "settings.ongoing.matchHistoryCount.label".to_string(),
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

        let queue_mode_setting = settings.register_definition(SettingDefinitionDto {
            id: QUEUE_MODE_SETTING_ID.to_string(),
            label_key: "settings.ongoing.queueMode.label".to_string(),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Text {
                placeholder_key: None,
            },
            default_value: Value::String(QUEUE_MODE_ALL_VALUE.to_string()),
            order: Some(11),
            visible: Some(false),
            options: None,
        })?;

        let manager = self.initialize(
            OngoingGameManagerSettings {
                match_history_count: count_setting.clone(),
                match_history_tag: queue_mode_setting.clone(),
            },
            sgp_shard,
        );

        let count_manager = manager.clone();
        count_setting.spawn_watch(false, move |_| {
            let count_manager = count_manager.clone();
            async move {
                count_manager.refresh_match_histories().await;
            }
        })?;

        let queue_mode_manager = manager.clone();
        queue_mode_setting.spawn_watch(false, move |_| {
            let queue_mode_manager = queue_mode_manager.clone();
            async move {
                queue_mode_manager.refresh_current().await;
            }
        })?;

        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![LcuShard, SgpShard, SettingsShard]
    }
}
