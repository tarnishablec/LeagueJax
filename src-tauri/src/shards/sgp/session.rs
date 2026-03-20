use std::sync::Arc;
use std::time::{Duration, Instant};

use tokio::sync::Mutex;

use super::http_client::SgpHttpClient;
use crate::error::AppError;
use crate::shards::lcu::LcuClientHandle;
use crate::shards::lcu::session::SgpTokenContext;

struct CachedSgpTokenContext {
    fetched_at: Instant,
    context: SgpTokenContext,
}

pub struct SgpSession {
    lcu_client: LcuClientHandle,
    http_client: Arc<SgpHttpClient>,
    token_context: Mutex<Option<CachedSgpTokenContext>>,
}

impl SgpSession {
    const TOKEN_CONTEXT_TTL: Duration = Duration::from_secs(300);

    pub fn new(lcu_client: LcuClientHandle, http_client: Arc<SgpHttpClient>) -> Self {
        Self {
            lcu_client,
            http_client,
            token_context: Mutex::new(None),
        }
    }

    pub fn http_client(&self) -> Arc<SgpHttpClient> {
        Arc::clone(&self.http_client)
    }

    pub async fn get_or_refresh_token_context(&self) -> Result<SgpTokenContext, AppError> {
        {
            let cache = self.token_context.lock().await;
            if let Some(cached) = cache.as_ref() {
                if cached.fetched_at.elapsed() < Self::TOKEN_CONTEXT_TTL {
                    return Ok(cached.context.clone());
                }
            }
        }

        let fresh = self.lcu_client.exchange_sgp_token_context().await?;

        let mut cache = self.token_context.lock().await;
        *cache = Some(CachedSgpTokenContext {
            fetched_at: Instant::now(),
            context: fresh.clone(),
        });

        Ok(fresh)
    }
}
