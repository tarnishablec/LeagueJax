use std::sync::Arc;

use async_trait::async_trait;
use uuid::{uuid, Uuid};

use crate::error::Result;
use crate::jax::Jax;

use super::Shard;

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000006");

pub struct StatisticsShard;

impl StatisticsShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for StatisticsShard {
    fn id(&self) -> Uuid {
        ID
    }

    fn label(&self) -> &'static str {
        "Statistics"
    }

    async fn setup(&self, _jax: Arc<Jax>) -> Result<()> {
        tracing::info!("[{}] setup", self.label());
        Ok(())
    }
}
