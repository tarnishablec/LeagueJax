use std::sync::Arc;
use async_trait::async_trait;
use tauri::AppHandle;

use crate::error::Result;
use crate::state::AppState;
use super::Shard;

pub struct AutoReplyShard;

#[allow(clippy::new_without_default)]
impl AutoReplyShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for AutoReplyShard {
    fn name(&self) -> &'static str {
        "auto-reply"
    }

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.name());
        Ok(())
    }
}
