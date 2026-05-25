mod handler;
mod host;
mod runtime;

pub(in crate::shards::mcp) use host::LeagueJaxMcpServer;
pub(super) use runtime::{
    clear_call_records, server_state, start_server, stop_server, McpServerRuntime,
};

use crate::shards::mcp::tool_catalog::McpToolDto;

pub(super) fn tool_dtos() -> Vec<McpToolDto> {
    LeagueJaxMcpServer::tool_dtos()
}
