use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};

pub struct KeyboardShard;

impl KeyboardShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for KeyboardShard {
    shard_id!(r"886fead7-3482-4c3f-a28b-20f5e972d221");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        todo!()
    }
}
