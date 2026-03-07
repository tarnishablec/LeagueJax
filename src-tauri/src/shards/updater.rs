use std::sync::Arc;

use async_trait::async_trait;
use tauri::AppHandle;
use uuid::{uuid, Uuid};

use crate::error::Result;
use crate::state::AppState;

use super::Shard;

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000009");

pub struct UpdaterShard;

#[allow(clippy::new_without_default)]
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

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.label());
        Ok(())
    }
}
