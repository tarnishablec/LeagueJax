use std::sync::Arc;

use async_trait::async_trait;
use tauri::AppHandle;
use uuid::{uuid, Uuid};

use crate::error::Result;
use crate::state::AppState;

use super::Shard;

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000005");

pub struct SavedPlayerShard;

#[allow(clippy::new_without_default)]
impl SavedPlayerShard {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Shard for SavedPlayerShard {
    fn id(&self) -> Uuid {
        ID
    }

    fn label(&self) -> &'static str {
        "Saved Players"
    }

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.label());
        Ok(())
    }
}
