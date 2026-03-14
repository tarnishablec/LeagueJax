use std::sync::Arc;

use async_trait::async_trait;
use uuid::{uuid, Uuid};

use crate::error::Result;
use crate::jax::Jax;

use crate::jax::shard::Shard;

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000007");

pub struct KeyboardShard;

impl KeyboardShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for KeyboardShard {
    fn id(&self) -> Uuid {
        ID
    }

    fn label(&self) -> &'static str {
        "Keyboard"
    }

    async fn setup(&self, _jax: Arc<Jax>) -> Result<()> {
        tracing::info!("[{}] setup", self.label());
        Ok(())
    }
}
