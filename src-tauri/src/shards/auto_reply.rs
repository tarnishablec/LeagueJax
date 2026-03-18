use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};

pub struct AutoReplyShard;

impl AutoReplyShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for AutoReplyShard {
    shard_id!("4201e831-e67b-4264-b2c0-46f2397a2da3");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }
}
