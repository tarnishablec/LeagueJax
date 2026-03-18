pub mod api;
pub mod config;

use core::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};

use self::api::SgpApi;

pub struct SgpShard {
    api: OnceLock<Arc<SgpApi>>,
}

impl SgpShard {
    pub fn new() -> Self {
        Self {
            api: OnceLock::new(),
        }
    }

    pub fn api(&self) -> Option<Arc<SgpApi>> {
        self.api.get().cloned()
    }
}

#[async_trait]
impl Shard for SgpShard {
    shard_id!("3f2a39a7-e3f4-4a76-85ef-1ca8a6f72514");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let api = SgpApi::new().map_err(|e| -> Box<dyn Error + Send + Sync> { Box::new(e) })?;
        let _ = self.api.set(Arc::new(api));
        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        depends![crate::shards::lcu::LcuShard]
    }
}
