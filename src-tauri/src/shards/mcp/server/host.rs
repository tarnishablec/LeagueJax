use rmcp::handler::server::router::tool::ToolRouter;
use rmcp::model::Tool;
use rmcp::service::{RequestContext, RoleServer};

use crate::shards::mcp::payloads::store::McpJsonPayloadStore;
use crate::shards::mcp::sessions::calls::{self, McpCallRecords};
use crate::shards::mcp::sessions::clients::{self, McpClients};
use crate::shards::mcp::tools::{self, catalog::McpToolDto};

#[derive(Clone)]
pub(in crate::shards::mcp) struct LeagueJaxMcpServer {
    app: tauri::AppHandle,
    endpoint: String,
    clients: McpClients,
    call_records: McpCallRecords,
    json_payloads: McpJsonPayloadStore,
}

impl LeagueJaxMcpServer {
    pub(in crate::shards::mcp) fn new(
        app: tauri::AppHandle,
        endpoint: String,
        clients: McpClients,
        call_records: McpCallRecords,
        json_payloads: McpJsonPayloadStore,
    ) -> Self {
        Self {
            app,
            endpoint,
            clients,
            call_records,
            json_payloads,
        }
    }

    pub(in crate::shards::mcp) fn app(&self) -> &tauri::AppHandle {
        &self.app
    }

    pub(in crate::shards::mcp) fn endpoint(&self) -> &str {
        &self.endpoint
    }

    pub(in crate::shards::mcp) fn clients(&self) -> &McpClients {
        &self.clients
    }

    pub(in crate::shards::mcp) fn call_records(&self) -> &McpCallRecords {
        &self.call_records
    }

    pub(in crate::shards::mcp) fn json_payloads(&self) -> &McpJsonPayloadStore {
        &self.json_payloads
    }

    pub(in crate::shards::mcp) fn tool_router() -> ToolRouter<Self> {
        tools::tool_router()
    }

    pub(in crate::shards::mcp) fn rmcp_tools() -> Vec<Tool> {
        Self::tool_router().list_all()
    }

    pub(in crate::shards::mcp) fn tool_dtos() -> Vec<McpToolDto> {
        tools::catalog::tools_to_dtos(Self::rmcp_tools())
    }

    pub(in crate::shards::mcp) fn require_session_id(
        &self,
        context: &RequestContext<RoleServer>,
    ) -> Result<String, String> {
        clients::session_id_from_extensions(&context.extensions).ok_or_else(|| {
            "Mcp-Session-Id header is required for MCP tool calls after initialization".to_string()
        })
    }

    pub(in crate::shards::mcp) fn record_tool_call(
        &self,
        tool_name: &'static str,
        context: &RequestContext<RoleServer>,
    ) {
        calls::record_tool_call_from_context(
            &self.app,
            &self.endpoint,
            &self.clients,
            &self.call_records,
            tool_name,
            context,
        );
    }
}
