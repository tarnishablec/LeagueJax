use std::sync::Arc;

use async_trait::async_trait;
use tauri::AppHandle;
use uuid::{uuid, Uuid};

use crate::error::Result;
use crate::state::AppState;

use super::Shard;

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000003");

pub struct AutoReplyShard;

#[allow(clippy::new_without_default)]
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

    fn label(&self) -> &'static str {
        "Auto Reply"
    }

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.label());
        Ok(())
    }
}
