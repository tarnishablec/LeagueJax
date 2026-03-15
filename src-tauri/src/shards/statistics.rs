use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::shard::Shard;
use jax::{shard_id, Jax};

pub struct StatisticsShard;

impl StatisticsShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for StatisticsShard {
    shard_id!(r"e5eab397-efba-4ee0-8507-def244597f1b");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        todo!()
    }
}
