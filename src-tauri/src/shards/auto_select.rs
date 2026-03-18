use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};

pub struct AutoSelectShard;

impl AutoSelectShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for AutoSelectShard {
    shard_id!("2c98048a-4233-4aa4-b9d7-5d11282e1ad6");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }
}
