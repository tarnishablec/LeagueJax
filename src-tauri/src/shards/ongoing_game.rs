use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};

pub struct OngoingGameShard;

impl OngoingGameShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for OngoingGameShard {
    shard_id!("38121643-b79d-4382-9592-c647da511c1b");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }
}
