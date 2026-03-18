use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};

pub struct AutoGameflowShard;

impl AutoGameflowShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for AutoGameflowShard {
    shard_id!("e2701f9c-c27c-4ad8-8ff0-a993c7fb98ef");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }
}
