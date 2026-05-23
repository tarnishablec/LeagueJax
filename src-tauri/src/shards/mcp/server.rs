use std::future::Future;
use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;

use rmcp::model::{Implementation, ProtocolVersion, ServerCapabilities, ServerInfo};
use rmcp::service::{MaybeSendFuture, NotificationContext, RequestContext, RoleServer};
use rmcp::transport::streamable_http_server::{
    session::local::LocalSessionManager, StreamableHttpServerConfig, StreamableHttpService,
};
use rmcp::{tool, tool_handler, tool_router, ServerHandler};
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

use crate::error::AppError;

use super::calls::{self, McpCallRecords};
use super::clients::{self, McpClients, McpServerStateDto};
use super::tools::{
    basic,
    registry::{self, McpToolDto},
};

const MCP_ROUTE: &str = "/mcp";

pub(super) struct McpServerRuntime {
    pub endpoint: String,
    pub clients: McpClients,
    pub call_records: McpCallRecords,
    cancel_token: CancellationToken,
    task: JoinHandle<()>,
    prune_task: JoinHandle<()>,
}

#[derive(Clone)]
struct LeagueJaxMcpServer {
    app: tauri::AppHandle,
    endpoint: String,
    clients: McpClients,
    call_records: McpCallRecords,
}

#[tool_router]
impl LeagueJaxMcpServer {
    fn new(
        app: tauri::AppHandle,
        endpoint: String,
        clients: McpClients,
        call_records: McpCallRecords,
    ) -> Self {
        Self {
            app,
            endpoint,
            clients,
            call_records,
        }
    }

    #[tool(
        description = "Check whether the LeagueJax MCP server is reachable.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    fn ping(&self, context: RequestContext<RoleServer>) -> rmcp::model::CallToolResult {
        self.record_tool_call("ping", &context);
        basic::ping()
    }

    #[tool(
        description = "Get basic LeagueJax MCP server information.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    fn get_server_info(&self, context: RequestContext<RoleServer>) -> rmcp::model::CallToolResult {
        self.record_tool_call("get_server_info", &context);
        basic::get_server_info()
    }

    #[tool(
        description = "List AI-friendly LeagueJax MCP tools.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    fn list_jax_tools(&self, context: RequestContext<RoleServer>) -> rmcp::model::CallToolResult {
        self.record_tool_call("list_jax_tools", &context);
        registry::list_jax_tools(Self::rmcp_tools())
    }
}

#[tool_handler]
impl ServerHandler for LeagueJaxMcpServer {
    fn on_initialized(
        &self,
        context: NotificationContext<RoleServer>,
    ) -> impl Future<Output = ()> + MaybeSendFuture + '_ {
        let client_info = context.peer.peer_info().cloned();
        async move {
            let identity = clients::register_client_connected(
                &self.app,
                &self.endpoint,
                &self.clients,
                &self.call_records,
                &context.extensions,
                client_info.as_ref(),
            )
            .await;
            tracing::info!(
                session_id = %identity.session_id,
                client_name = %identity.client_name,
                client_version = %identity.client_version,
                endpoint = %self.endpoint,
                "MCP client initialized"
            );
        }
    }

    fn get_info(&self) -> ServerInfo {
        ServerInfo::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::from_build_env())
            .with_protocol_version(ProtocolVersion::V_2024_11_05)
            .with_instructions(
                "LeagueJax exposes explicit, read-only local tools for AI-assisted analysis."
                    .to_string(),
            )
    }
}

impl LeagueJaxMcpServer {
    fn rmcp_tools() -> Vec<rmcp::model::Tool> {
        Self::tool_router().list_all()
    }

    fn tool_dtos() -> Vec<McpToolDto> {
        registry::tools_to_dtos(Self::rmcp_tools())
    }

    fn record_tool_call(&self, tool_name: &'static str, context: &RequestContext<RoleServer>) {
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

pub(super) fn tool_dtos() -> Vec<McpToolDto> {
    LeagueJaxMcpServer::tool_dtos()
}

pub(super) async fn server_state(
    runtime: &Arc<Mutex<Option<McpServerRuntime>>>,
) -> McpServerStateDto {
    let running = {
        let guard = runtime.lock().await;
        guard.as_ref().map(|server| {
            (
                server.endpoint.clone(),
                server.clients.clone(),
                server.call_records.clone(),
            )
        })
    };

    match running {
        Some((endpoint, clients, call_records)) => McpServerStateDto::running(
            endpoint,
            clients::clients_snapshot(&clients).await,
            calls::call_records_snapshot(&call_records).await,
        ),
        None => McpServerStateDto::stopped(),
    }
}

pub(super) fn endpoint_for_port(port: u16) -> String {
    format!("http://127.0.0.1:{port}{MCP_ROUTE}")
}

fn bind_address_for_port(port: u16) -> SocketAddr {
    SocketAddr::from((Ipv4Addr::LOCALHOST, port))
}

/// The MCP listener is loopback-only until auth/pairing is introduced.
pub(super) async fn start_server(
    runtime: &Arc<Mutex<Option<McpServerRuntime>>>,
    parent_token: CancellationToken,
    port: u16,
    app: tauri::AppHandle,
) -> Result<(String, McpClients, McpCallRecords), AppError> {
    let mut guard = runtime.lock().await;
    if let Some(server) = guard.as_ref() {
        return Ok((
            server.endpoint.clone(),
            server.clients.clone(),
            server.call_records.clone(),
        ));
    }

    let endpoint = endpoint_for_port(port);
    let listener = TcpListener::bind(bind_address_for_port(port)).await?;
    let server_token = parent_token.child_token();
    let clients = clients::new_clients();
    let call_records = calls::new_call_records();
    let prune_task = clients::start_client_prune_task(
        app.clone(),
        endpoint.clone(),
        clients.clone(),
        call_records.clone(),
        server_token.child_token(),
    );
    let service_app = app.clone();
    let service_endpoint = endpoint.clone();
    let service_clients = clients.clone();
    let service_call_records = call_records.clone();
    let service = StreamableHttpService::new(
        move || {
            Ok(LeagueJaxMcpServer::new(
                service_app.clone(),
                service_endpoint.clone(),
                service_clients.clone(),
                service_call_records.clone(),
            ))
        },
        LocalSessionManager::default().into(),
        StreamableHttpServerConfig::default().with_cancellation_token(server_token.child_token()),
    );
    let router = axum::Router::new().nest_service(MCP_ROUTE, service);
    let shutdown_token = server_token.clone();
    let task = tokio::spawn(async move {
        let result = axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                shutdown_token.cancelled().await;
            })
            .await;

        if let Err(error) = result {
            tracing::error!(error = %error, "MCP server stopped with error");
        }
    });

    *guard = Some(McpServerRuntime {
        endpoint: endpoint.clone(),
        clients: clients.clone(),
        call_records: call_records.clone(),
        cancel_token: server_token,
        task,
        prune_task,
    });
    tracing::info!(endpoint, "MCP server started");
    Ok((endpoint, clients, call_records))
}

pub(super) async fn stop_server(runtime: &Arc<Mutex<Option<McpServerRuntime>>>) -> Option<String> {
    let server = {
        let mut guard = runtime.lock().await;
        guard.take()
    };

    let server = server?;

    let endpoint = server.endpoint.clone();
    server.cancel_token.cancel();
    server.clients.lock().await.clear();
    server.call_records.lock().await.clear();
    match server.task.await {
        Ok(()) => {
            tracing::info!(endpoint, "MCP server stopped");
        }
        Err(error) if error.is_cancelled() => {
            tracing::info!(endpoint, "MCP server task was cancelled");
        }
        Err(error) => {
            tracing::warn!(error = %error, endpoint, "MCP server task failed while stopping");
        }
    }
    match server.prune_task.await {
        Ok(()) => {
            tracing::debug!(endpoint, "MCP client prune task stopped");
        }
        Err(error) if error.is_cancelled() => {
            tracing::debug!(endpoint, "MCP client prune task was cancelled");
        }
        Err(error) => {
            tracing::warn!(
                error = %error,
                endpoint,
                "MCP client prune task failed while stopping"
            );
        }
    }
    Some(endpoint)
}
