use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use uuid::Uuid;

pub struct AutoAcceptShard;

impl AutoAcceptShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for AutoAcceptShard {
    shard_id!("7744b799-c21d-48df-9a9e-fbce77c58452");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![]
    }
}
