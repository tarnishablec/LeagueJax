use std::sync::Arc;

use async_trait::async_trait;
use tauri::AppHandle;
use uuid::{uuid, Uuid};

use crate::error::Result;
use crate::state::AppState;

use super::Shard;

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000006");

pub struct StatisticsShard;

#[allow(clippy::new_without_default)]
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

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.label());
        Ok(())
    }
}
