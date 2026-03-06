use std::sync::Arc;
use async_trait::async_trait;
use tauri::AppHandle;

use crate::error::Result;
use crate::state::AppState;
use super::Shard;

pub struct SavedPlayerShard;

#[allow(clippy::new_without_default)]
impl SavedPlayerShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for SavedPlayerShard {
    fn name(&self) -> &'static str {
        "saved-player"
    }

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.name());
        Ok(())
    }
}
