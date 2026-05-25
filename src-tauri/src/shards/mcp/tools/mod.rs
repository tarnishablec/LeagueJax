use std::sync::Arc;

use jax::Jax;
use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::model::CallToolResult;
use serde::Serialize;
use tauri::Manager;

use crate::error::AppError;
use crate::shards::mcp::payloads::{store::McpJsonPayloadStore, transport};
use crate::shards::mcp::server::LeagueJaxMcpServer;

pub(in crate::shards::mcp) mod catalog;
mod game_reference;
mod matches;
mod server_meta;
mod summoners;

pub(in crate::shards::mcp) fn tool_router() -> ToolRouter<LeagueJaxMcpServer> {
    LeagueJaxMcpServer::server_meta_tool_router()
        + LeagueJaxMcpServer::game_reference_tool_router()
        + LeagueJaxMcpServer::payloads_tool_router()
        + LeagueJaxMcpServer::summoners_tool_router()
        + LeagueJaxMcpServer::matches_tool_router()
}

/// MCP tools intentionally call Tauri command functions so commands remain the shared public boundary.
fn jax_state(app: &tauri::AppHandle) -> Result<tauri::State<'_, Arc<Jax>>, String> {
    app.try_state::<Arc<Jax>>()
        .ok_or_else(|| "Jax state is not available".to_string())
}

async fn structured_result<T: Serialize>(
    store: &McpJsonPayloadStore,
    session_id: &str,
    label: Option<String>,
    result: Result<T, AppError>,
) -> Result<CallToolResult, String> {
    let value = result.map_err(|error| error.to_string())?;
    transport::emit_json_result(store, session_id, label, value).await
}
