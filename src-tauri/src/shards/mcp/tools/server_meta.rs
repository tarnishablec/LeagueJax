use rmcp::model::CallToolResult;
use rmcp::{tool, tool_router};
use serde_json::json;

use crate::shards::mcp::payloads::transport;
use crate::shards::mcp::server::LeagueJaxMcpServer;
use crate::shards::mcp::tool_catalog;

#[tool_router(router = server_meta_tool_router, vis = "pub(in crate::shards::mcp)")]
impl LeagueJaxMcpServer {
    #[tool(
        description = "Check whether the LeagueJax MCP server is reachable.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    fn ping(&self) -> Result<CallToolResult, String> {
        ping_result()
    }

    #[tool(
        description = "Get basic LeagueJax MCP server information.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    fn get_server_info(&self) -> Result<CallToolResult, String> {
        get_server_info_result()
    }

    #[tool(
        description = "List AI-friendly LeagueJax MCP tools.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    fn list_jax_tools(&self) -> Result<CallToolResult, String> {
        tool_catalog::list_jax_tools(Self::rmcp_tools())
    }
}

fn ping_result() -> Result<CallToolResult, String> {
    transport::inline_json_result(json!({
        "ok": true,
        "service": "league-jax",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

fn get_server_info_result() -> Result<CallToolResult, String> {
    transport::inline_json_result(json!({
        "service": "league-jax",
        "name": "LeagueJax MCP",
        "version": env!("CARGO_PKG_VERSION")
    }))
}
