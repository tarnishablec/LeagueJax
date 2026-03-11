use std::sync::Arc;

use async_trait::async_trait;
use uuid::{uuid, Uuid};

use crate::error::Result;
use crate::jax::Jax;

use super::Shard;

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000004");

pub struct OngoingGameShard;

#[allow(clippy::new_without_default)]
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

    fn label(&self) -> &'static str {
        "Ongoing Game"
    }

    async fn setup(&self, _jax: Arc<Jax>) -> Result<()> {
        tracing::info!("[{}] setup", self.label());
        Ok(())
    }
}
