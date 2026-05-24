use std::sync::Arc;

use jax::Jax;
use rmcp::model::CallToolResult;
use serde::Serialize;
use tauri::Manager;

use crate::error::AppError;
use crate::shards::mcp::payload_store::McpJsonPayloadStore;
use crate::shards::mcp::result_transport;

pub(super) mod basic;
pub(super) mod game_data;
pub(super) mod history;
pub(super) mod payloads;
pub(super) mod registry;

/// MCP tools intentionally call Tauri command functions so commands remain the shared public boundary.
fn jax_state(app: &tauri::AppHandle) -> Result<tauri::State<'_, Arc<Jax>>, String> {
    app.try_state::<Arc<Jax>>()
        .ok_or_else(|| "Jax state is not available".to_string())
}

async fn structured_result<T: Serialize>(
    store: &McpJsonPayloadStore,
    label: Option<String>,
    result: Result<T, AppError>,
) -> Result<CallToolResult, String> {
    let value = result.map_err(|error| error.to_string())?;
    result_transport::emit_json_result(store, label, value).await
}
