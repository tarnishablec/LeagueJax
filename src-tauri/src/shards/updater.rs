use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};

pub struct UpdaterShard;

impl UpdaterShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for UpdaterShard {
    shard_id!("0adeb8a1-2f80-41af-a381-a852a08e1ab5");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        todo!()
    }
}
