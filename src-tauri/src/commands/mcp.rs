use std::sync::Arc;

use jax::Jax;
use tauri::State;

use crate::error::AppError;
use crate::shards::mcp::{McpServerStateDto, McpShard, McpToolDto};

#[tauri::command]
pub async fn mcp_get_server_state(jax: State<'_, Arc<Jax>>) -> Result<McpServerStateDto, AppError> {
    let mcp = jax.get_shard::<McpShard>();
    Ok(mcp.server_state().await)
}

#[tauri::command]
pub async fn mcp_list_tools(jax: State<'_, Arc<Jax>>) -> Result<Vec<McpToolDto>, AppError> {
    let mcp = jax.get_shard::<McpShard>();
    Ok(mcp.tools())
}
