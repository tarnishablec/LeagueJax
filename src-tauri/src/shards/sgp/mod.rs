pub mod api;
pub mod config;
pub mod http_client;
pub mod session;

use core::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};

use self::api::SgpApi;
use self::http_client::SgpHttpClient;
use self::session::SgpSession;
use crate::error::AppError;
use crate::shards::lcu::LcuClientHandle;

static SGP_HTTP_CLIENT: OnceLock<Arc<SgpHttpClient>> = OnceLock::new();

pub struct SgpShard;

impl SgpShard {
    pub fn new() -> Self {
        Self
    }

    pub fn spg_from_lcu(&self, lcu_client: LcuClientHandle) -> Result<SgpClientHandle, AppError> {
        SgpClientHandle::try_from(lcu_client)
    }
}

#[derive(Clone)]
pub struct SgpClientHandle {
    session: Arc<SgpSession>,
}

impl SgpClientHandle {
    pub(crate) fn new(session: Arc<SgpSession>) -> Self {
        Self { session }
    }

    pub async fn get_or_refresh_token_context(
        &self,
    ) -> Result<crate::shards::lcu::session::SgpTokenContext, AppError> {
        self.session.get_or_refresh_token_context().await
    }

    pub(crate) fn http_client(&self) -> Arc<SgpHttpClient> {
        self.session.http_client()
    }

    pub fn api(&self) -> SgpApi {
        SgpApi::new(self.clone())
    }
}

impl TryFrom<LcuClientHandle> for SgpClientHandle {
    type Error = AppError;

    fn try_from(lcu_client: LcuClientHandle) -> Result<Self, Self::Error> {
        let http_client = shared_http_client()?;
        Ok(Self::new(Arc::new(SgpSession::new(
            lcu_client,
            http_client,
        ))))
    }
}

fn shared_http_client() -> Result<Arc<SgpHttpClient>, AppError> {
    if let Some(existing) = SGP_HTTP_CLIENT.get() {
        return Ok(existing.clone());
    }

    let created = Arc::new(SgpHttpClient::new()?);
    let _ = SGP_HTTP_CLIENT.set(created.clone());

    if let Some(existing) = SGP_HTTP_CLIENT.get() {
        Ok(existing.clone())
    } else {
        Ok(created)
    }
}

#[async_trait]
impl Shard for SgpShard {
    shard_id!("3f2a39a7-e3f4-4a76-85ef-1ca8a6f72514");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        vec![]
    }
}
