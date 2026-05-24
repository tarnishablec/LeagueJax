use rmcp::model::CallToolResult;

use crate::commands;
use crate::shards::mcp::payload_store::McpJsonPayloadStore;

use super::{jax_state, structured_result};

pub(in crate::shards::mcp) async fn get_queues(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        Some("get_queues".to_string()),
        commands::map::lcu_get_queues(None, None, jax).await,
    )
    .await
}
