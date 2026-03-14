use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::shard::Shard;
use jax::Jax;
use uuid::{uuid, Uuid};

pub const ID: Uuid = uuid!("38121643-b79d-4382-9592-c647da511c1b");

pub struct OngoingGameShard;

impl OngoingGameShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for OngoingGameShard {
    fn id(&self) -> Uuid {
        ID
    }

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        todo!()
    }
}
