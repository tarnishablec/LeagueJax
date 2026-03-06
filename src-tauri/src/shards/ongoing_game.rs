use std::sync::Arc;
use async_trait::async_trait;
use tauri::AppHandle;

use crate::error::Result;
use crate::state::AppState;
use super::Shard;

pub struct OngoingGameShard;

#[allow(clippy::new_without_default)]
impl OngoingGameShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for OngoingGameShard {
    fn name(&self) -> &'static str {
        "ongoing-game"
    }

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.name());
        Ok(())
    }
}
