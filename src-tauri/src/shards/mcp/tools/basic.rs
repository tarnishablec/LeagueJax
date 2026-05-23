use rmcp::model::{CallToolResult, Content};
use serde_json::json;

pub(in crate::shards::mcp) fn ping() -> CallToolResult {
    CallToolResult::structured(json!({
        "ok": true,
        "service": "league-jax",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

pub(in crate::shards::mcp) fn get_server_info() -> CallToolResult {
    CallToolResult::success(vec![Content::text(format!(
        "LeagueJax MCP {}",
        env!("CARGO_PKG_VERSION")
    ))])
}
