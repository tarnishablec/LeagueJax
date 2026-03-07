use std::sync::Arc;

use async_trait::async_trait;
use tauri::AppHandle;
use uuid::{uuid, Uuid};

use crate::error::Result;
use crate::state::AppState;

use super::Shard;

pub const ID: Uuid = uuid!("00000000-0000-4000-8000-000000000007");

pub struct KeyboardShard;

#[allow(clippy::new_without_default)]
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

    async fn setup(&self, _app: &AppHandle, _state: Arc<AppState>) -> Result<()> {
        tracing::info!("[{}] setup", self.label());
        Ok(())
    }
}
