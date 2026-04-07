pub mod api;
pub mod config;
pub mod http_client;
pub mod manager;
pub mod matches;
pub mod session;

use core::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};

use self::manager::SgpManager;
use self::session::SgpSession;
use crate::error::AppError;
use crate::network_config::{NetworkConfig, REQUEST_TIMEOUT_SETTING_ID};
use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::LcuShard;
use crate::shards::settings::SettingsShard;

pub struct SgpShard {
    pub manager: SgpManager,
    network_config: OnceLock<Arc<NetworkConfig>>,
}

impl SgpShard {
    pub fn new() -> Self {
        Self {
            manager: SgpManager::new(),
            network_config: OnceLock::new(),
        }
    }

    pub fn network_config(&self) -> Option<Arc<NetworkConfig>> {
        self.network_config.get().cloned()
    }
}

#[async_trait]
pub trait LcuSessionSgpExt {
    async fn to_sgp(&self, sgp_shard: &SgpShard) -> Result<Arc<SgpSession>, AppError>;
}

#[async_trait]
impl LcuSessionSgpExt for Arc<LcuSession> {
    async fn to_sgp(&self, sgp_shard: &SgpShard) -> Result<Arc<SgpSession>, AppError> {
        let network_config = sgp_shard
            .network_config()
            .ok_or_else(|| AppError::other("SGP network config is not initialized"))?;
        sgp_shard.manager.get_or_create(self, network_config).await
    }
}

#[async_trait]
impl Shard for SgpShard {
    shard_id!("3f2a39a7-e3f4-4a76-85ef-1ca8a6f72514");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let _ = settings.setting_handle(REQUEST_TIMEOUT_SETTING_ID)?;
        let _ = self
            .network_config
            .set(Arc::new(NetworkConfig::new(settings)));
        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        depends![LcuShard, SettingsShard]
    }
}
