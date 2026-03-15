use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::shard::Shard;
use jax::{shard_id, Jax};


pub struct TrayShard;

impl TrayShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for TrayShard {
    shard_id!("eb4fd044-6a85-4d25-a59b-d7ec6d605d17");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        todo!()
    }
}
