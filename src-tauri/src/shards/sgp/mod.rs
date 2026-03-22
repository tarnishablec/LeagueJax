pub mod api;
pub mod config;
pub mod http_client;
pub mod manager;
pub mod session;

use core::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};

use self::manager::SgpManager;
use self::session::SgpSession;
use crate::error::AppError;
use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::LcuShard;

pub struct SgpShard {
    pub manager: SgpManager,
}

impl SgpShard {
    pub fn new() -> Self {
        Self {
            manager: SgpManager::new(),
        }
    }

    pub async fn spg_from_lcu(
        &self,
        lcu_session: Arc<LcuSession>,
    ) -> Result<Arc<SgpSession>, AppError> {
        self.manager.get_or_create(&lcu_session).await
    }
}

#[async_trait]
impl Shard for SgpShard {
    shard_id!("3f2a39a7-e3f4-4a76-85ef-1ca8a6f72514");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        depends![LcuShard]
    }
}
