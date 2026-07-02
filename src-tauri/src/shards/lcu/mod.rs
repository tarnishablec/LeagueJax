pub mod api;
pub mod asset_proxy;
pub mod auth;
pub mod concepts;
pub mod detector;
pub mod endpoints;
pub mod http_client;
pub mod installs;
pub mod instance;
pub mod manager;
pub mod riot_client;
pub mod session;
pub mod session_cache;
pub mod static_data_cache;
pub mod tls;
pub mod watcher;

use core::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use tokio_util::sync::CancellationToken;

use self::manager::LcuManager;
use crate::error::AppError;
use crate::shards::log::{HttpLogPolicy, LogShard};
use crate::shards::network::{NetworkConfig, NetworkShard};

pub struct LcuShard {
    manager: OnceLock<Arc<LcuManager>>,
    network_config: OnceLock<Arc<NetworkConfig>>,
    http_log_policy: OnceLock<Arc<HttpLogPolicy>>,
}

impl LcuShard {
    pub fn new() -> Self {
        Self {
            manager: OnceLock::new(),
            network_config: OnceLock::new(),
            http_log_policy: OnceLock::new(),
        }
    }

    pub fn manager(&self) -> Option<Arc<LcuManager>> {
        self.manager.get().cloned()
    }

    pub fn network_config(&self) -> Option<Arc<NetworkConfig>> {
        self.network_config.get().cloned()
    }

    pub fn http_log_policy(&self) -> Option<Arc<HttpLogPolicy>> {
        self.http_log_policy.get().cloned()
    }

    pub fn initialize(&self, cancel_token: CancellationToken) -> Result<Arc<LcuManager>, AppError> {
        if let Some(manager) = self.manager() {
            return Ok(manager);
        }

        let network_config = self.network_config().ok_or_else(|| {
            AppError::other("LCU network config must be initialized before manager")
        })?;
        let http_log_policy = self.http_log_policy().ok_or_else(|| {
            AppError::other("LCU HTTP log policy must be initialized before manager")
        })?;

        let manager = Arc::new(LcuManager::new(
            cancel_token,
            network_config,
            http_log_policy,
        ));
        if self.manager.set(manager.clone()).is_err() {
            if let Some(existing) = self.manager() {
                return Ok(existing);
            }
        }
        Ok(manager)
    }
}

#[async_trait]
impl Shard for LcuShard {
    shard_id!("67e8e272-ecb1-46ae-87e8-481b248d8d01");
    depends![NetworkShard, LogShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let network = jax.get_shard::<NetworkShard>();
        let log = jax.get_shard::<LogShard>();
        if self.network_config.set(network.config()?).is_err() {
            return Err(AppError::other("LCU network config is already initialized").into());
        }
        if self.http_log_policy.set(log.http_log_policy()?).is_err() {
            return Err(AppError::other("LCU HTTP log policy is already initialized").into());
        }
        Ok(())
    }
}
