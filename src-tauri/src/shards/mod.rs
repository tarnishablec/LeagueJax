use std::sync::Arc;

use async_trait::async_trait;
use tauri::AppHandle;

use crate::error::Result;
use crate::lcu::LcuEvent;
use crate::state::AppState;

// Sub-module declarations (stub files will be created in Task 9)
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
    /// Unique shard identifier
    fn name(&self) -> &'static str;

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
