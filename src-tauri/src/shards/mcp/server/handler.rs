use std::future::Future;

use rmcp::model::{Implementation, ProtocolVersion, ServerCapabilities, ServerInfo};
use rmcp::service::{MaybeSendFuture, NotificationContext, RoleServer};
use rmcp::{tool_handler, ServerHandler};

use crate::shards::mcp::sessions::clients;

use super::LeagueJaxMcpServer;

#[tool_handler]
impl ServerHandler for LeagueJaxMcpServer {
    fn on_initialized(
        &self,
        context: NotificationContext<RoleServer>,
    ) -> impl Future<Output = ()> + MaybeSendFuture + '_ {
        let client_info = context.peer.peer_info().cloned();
        async move {
            let identity = clients::register_client_connected(
                self.app(),
                self.endpoint(),
                self.clients(),
                self.call_records(),
                &context.extensions,
                client_info.as_ref(),
            )
            .await;
            tracing::info!(
                session_id = %identity.session_id,
                client_name = %identity.client_name,
                client_version = %identity.client_version,
                endpoint = %self.endpoint(),
                "MCP client initialized"
            );
        }
    }

    fn get_info(&self) -> ServerInfo {
        ServerInfo::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::from_build_env())
            .with_protocol_version(ProtocolVersion::V_2025_11_25)
            .with_instructions(
                "LeagueJax exposes explicit, read-only local tools for AI-assisted analysis. Tool calls after initialization require Mcp-Session-Id. JSON results use a structured envelope with kind inline or payload; payload handles are scoped to the owning MCP session."
                    .to_string(),
            )
    }
}
