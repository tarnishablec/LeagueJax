pub mod api;
pub mod config;
pub mod http_client;
pub mod manager;
pub mod matches;
pub mod session;

use core::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};

use self::manager::SgpManager;
use self::session::SgpSession;
use crate::error::AppError;
use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::{LcuShard, REQUEST_TIMEOUT_SETTING_ID};
use crate::shards::settings::{SettingHandle, SettingsShard};
use std::sync::OnceLock;

pub struct SgpShard {
    pub manager: SgpManager,
    request_timeout_setting: OnceLock<SettingHandle>,
}

impl SgpShard {
    pub fn new() -> Self {
        Self {
            manager: SgpManager::new(),
            request_timeout_setting: OnceLock::new(),
        }
    }

    pub fn request_timeout_setting(&self) -> Option<SettingHandle> {
        self.request_timeout_setting.get().cloned()
    }
}

#[async_trait]
pub trait LcuSessionSgpExt {
    async fn to_sgp(&self, sgp_shard: &SgpShard) -> Result<Arc<SgpSession>, AppError>;
}

#[async_trait]
impl LcuSessionSgpExt for Arc<LcuSession> {
    async fn to_sgp(&self, sgp_shard: &SgpShard) -> Result<Arc<SgpSession>, AppError> {
        let request_timeout_setting = sgp_shard
            .request_timeout_setting()
            .ok_or_else(|| AppError::other("SGP request timeout setting is not initialized"))?;
        sgp_shard
            .manager
            .get_or_create(self, request_timeout_setting)
            .await
    }
}

#[async_trait]
impl Shard for SgpShard {
    shard_id!("3f2a39a7-e3f4-4a76-85ef-1ca8a6f72514");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let request_timeout_setting = settings.setting_handle(REQUEST_TIMEOUT_SETTING_ID)?;
        let _ = self.request_timeout_setting.set(request_timeout_setting);
        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        depends![LcuShard, SettingsShard]
    }
}
