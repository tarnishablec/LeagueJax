use std::sync::Arc;

use async_trait::async_trait;
use tauri::AppHandle;
use uuid::Uuid;

use crate::error::Result;
use crate::lcu::LcuEvent;
use crate::state::AppState;

pub mod auto_gameflow;
pub mod auto_reply;
pub mod auto_select;
pub mod keyboard;
pub mod ongoing_game;
pub mod saved_player;
pub mod statistics;
pub mod tray;
pub mod updater;

/// All feature shards must implement this trait
#[async_trait]
pub trait Shard: Send + Sync {
    /// Stable UUID — must match the corresponding Web-side SHARD_IDS constant
    fn id(&self) -> Uuid;

    /// Human-readable display name (used for logging and get_shards response)
    fn label(&self) -> &'static str;

    /// Called at app startup: register Tauri commands, load config, etc.
    async fn setup(&self, app: &AppHandle, state: Arc<AppState>) -> Result<()>;

    /// Called when LCU connects
    async fn on_lcu_connected(&self, _state: Arc<AppState>) -> Result<()> {
        Ok(())
    }

    /// Called when LCU disconnects
    async fn on_lcu_disconnected(&self, _state: Arc<AppState>) -> Result<()> {
        Ok(())
    }

    /// Receives LCU WebSocket events
    async fn on_lcu_event(&self, _event: &LcuEvent, _state: Arc<AppState>) -> Result<()> {
        Ok(())
    }
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/// Tauri-managed state: the full list of registered shards
pub struct ShardRegistry(pub Vec<Arc<dyn Shard>>);

/// Serialisable shard descriptor sent to the frontend via `get_shards`
#[derive(serde::Serialize, Clone)]
pub struct ShardInfo {
    pub id: Uuid,
    pub label: &'static str,
    pub enabled: bool,
}

impl ShardRegistry {
    pub fn info(&self) -> Vec<ShardInfo> {
        self.0
            .iter()
            .map(|s| ShardInfo {
                id: s.id(),
                label: s.label(),
                enabled: true, // runtime toggle comes later
            })
            .collect()
    }
}
