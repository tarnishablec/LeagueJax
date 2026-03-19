pub mod api;
pub mod config;

use core::error::Error;
use std::sync::{Arc, OnceLock};
use std::time::{Duration, Instant};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use tokio::sync::Mutex;

use self::api::SgpApi;
use crate::error::AppError;
use crate::shards::lcu::manager::SgpTokenContext;
use crate::shards::lcu::LcuShard;

struct CachedSgpTokenContext {
    focus_pid: u32,
    fetched_at: Instant,
    context: SgpTokenContext,
}

pub struct SgpShard {
    api: OnceLock<Arc<SgpApi>>,
    token_context: Mutex<Option<CachedSgpTokenContext>>,
}

impl SgpShard {
    const TOKEN_CONTEXT_TTL: Duration = Duration::from_secs(300);

    pub fn new() -> Self {
        Self {
            api: OnceLock::new(),
            token_context: Mutex::new(None),
        }
    }

    pub fn api(&self) -> Option<Arc<SgpApi>> {
        self.api.get().cloned()
    }

    pub async fn get_or_refresh_token_context(
        &self,
        jax: &Arc<Jax>,
    ) -> Result<SgpTokenContext, AppError> {
        let manager = jax
            .get_shard::<LcuShard>()
            .manager()
            .ok_or(AppError::LcuNotConnected)?;

        let focus_pid = manager.focused_pid().await.ok_or(AppError::LcuNotConnected)?;

        {
            let cache = self.token_context.lock().await;
            if let Some(cached) = cache.as_ref() {
                if cached.focus_pid == focus_pid
                    && cached.fetched_at.elapsed() < Self::TOKEN_CONTEXT_TTL
                {
                    return Ok(cached.context.clone());
                }
            }
        }

        let fresh = manager.exchange_sgp_token_context().await?;
        let mut cache = self.token_context.lock().await;
        *cache = Some(CachedSgpTokenContext {
            focus_pid,
            fetched_at: Instant::now(),
            context: fresh.clone(),
        });

        Ok(fresh)
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
