use rmcp::model::CallToolResult;
use rmcp::service::{RequestContext, RoleServer};
use rmcp::{tool, tool_router};
use serde_json::json;

use crate::shards::mcp::payloads::transport;
use crate::shards::mcp::server::LeagueJaxMcpServer;

use super::catalog;

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
    fn ping(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let _session_id = self.require_session_id(&context)?;
        self.record_tool_call("ping", &context);
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
    fn get_server_info(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let _session_id = self.require_session_id(&context)?;
        self.record_tool_call("get_server_info", &context);
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
    fn list_jax_tools(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let _session_id = self.require_session_id(&context)?;
        self.record_tool_call("list_jax_tools", &context);
        catalog::list_jax_tools(Self::rmcp_tools())
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
