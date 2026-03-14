use std::sync::Arc;

use async_trait::async_trait;
use uuid::{uuid, Uuid};

use crate::error::Result;
use crate::jax::Jax;

use crate::jax::shard::Shard;

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000009");

pub struct UpdaterShard;

impl UpdaterShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for UpdaterShard {
    fn id(&self) -> Uuid {
        ID
    }

    fn label(&self) -> &'static str {
        "Updater"
    }

    async fn setup(&self, _jax: Arc<Jax>) -> Result<()> {
        tracing::info!("[{}] setup", self.label());
        Ok(())
    }
}
