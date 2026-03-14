use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::shard::Shard;
use jax::Jax;
use uuid::{uuid, Uuid};

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000003");

pub struct AutoReplyShard;

impl AutoReplyShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for AutoReplyShard {
    fn id(&self) -> Uuid {
        ID
    }

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        todo!()
    }
}
