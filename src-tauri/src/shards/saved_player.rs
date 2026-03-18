use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};

pub struct SavedPlayerShard;

impl SavedPlayerShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for SavedPlayerShard {
    shard_id!("0885405c-362d-45b6-b212-f943046c401f");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }
}
