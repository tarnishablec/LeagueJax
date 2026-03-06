use std::sync::Arc;
use async_trait::async_trait;
use tauri::AppHandle;

use crate::error::Result;
use crate::state::AppState;
use super::Shard;

pub struct UpdaterShard;

#[allow(clippy::new_without_default)]
impl UpdaterShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for UpdaterShard {
    fn name(&self) -> &'static str {
        "updater"
    }

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.name());
        Ok(())
    }
}
