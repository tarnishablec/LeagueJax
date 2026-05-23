use std::future::Future;
use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;

use rmcp::handler::server::wrapper::Parameters;
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
use super::payload_store::{self, McpJsonPayloadStore};
use super::tools::{
    basic, history, payloads,
    registry::{self, McpToolDto},
};

const MCP_ROUTE: &str = "/mcp";

pub(super) struct McpServerRuntime {
    pub endpoint: String,
    pub clients: McpClients,
    pub call_records: McpCallRecords,
    pub json_payloads: McpJsonPayloadStore,
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
    json_payloads: McpJsonPayloadStore,
}

#[tool_router]
impl LeagueJaxMcpServer {
    fn new(
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

    #[tool(
        description = "List JSON payload handles currently held by the LeagueJax MCP server.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn list_json_payloads(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("list_json_payloads", &context);
        payloads::list_json_payloads(&self.json_payloads).await
    }

    #[tool(
        description = "Describe the schema shape of a cached JSON payload without returning the full payload.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn describe_json_payload(
        &self,
        Parameters(params): Parameters<payloads::DescribeJsonPayloadParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("describe_json_payload", &context);
        payloads::describe_json_payload(&self.json_payloads, params).await
    }

    #[tool(
        description = "Query selected values from a cached JSON payload using RFC 6901 JSON Pointers.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn query_json_payload_pointers(
        &self,
        Parameters(params): Parameters<payloads::QueryJsonPayloadPointersParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("query_json_payload_pointers", &context);
        payloads::query_json_payload_pointers(&self.json_payloads, params).await
    }

    #[tool(
        description = "Drop a cached JSON payload handle from the LeagueJax MCP server.",
        annotations(
            read_only_hint = false,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn drop_json_payload(
        &self,
        Parameters(params): Parameters<payloads::DropJsonPayloadParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("drop_json_payload", &context);
        payloads::drop_json_payload(&self.json_payloads, params).await
    }

    #[tool(
        description = "Get the summoner profile for the focused League client session.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_current_summoner(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("get_current_summoner", &context);
        history::get_current_summoner(&self.app, &self.json_payloads).await
    }

    #[tool(
        description = "Get the SGP server id for the focused League client session.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_current_sgp_server_id(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("get_current_sgp_server_id", &context);
        history::get_current_sgp_server_id(&self.app, &self.json_payloads).await
    }

    #[tool(
        description = "Resolve a human server name or server id to matching SGP server ids.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn resolve_sgp_server_ids(
        &self,
        Parameters(params): Parameters<history::ResolveSgpServerIdsParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("resolve_sgp_server_ids", &context);
        history::resolve_sgp_server_ids(&self.json_payloads, params).await
    }

    #[tool(
        description = "Search one summoner by exact Riot ID gameName and tagLine.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn search_summoner(
        &self,
        Parameters(params): Parameters<history::SearchSummonerParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("search_summoner", &context);
        history::search_summoner(&self.app, &self.json_payloads, params).await
    }

    #[tool(
        description = "Search summoners by PUUID, exact Riot ID, or fuzzy name on an optional SGP server.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn search_summoners(
        &self,
        Parameters(params): Parameters<history::SearchSummonersParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("search_summoners", &context);
        history::search_summoners(&self.app, &self.json_payloads, params).await
    }

    #[tool(
        description = "Get a summoner profile by PUUID on an optional SGP server.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_summoner_by_puuid(
        &self,
        Parameters(params): Parameters<history::GetSummonerByPuuidParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("get_summoner_by_puuid", &context);
        history::get_summoner_by_puuid(&self.app, &self.json_payloads, params).await
    }

    #[tool(
        description = "Get ranked stats for a summoner PUUID from the focused League client session.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_ranked_summary(
        &self,
        Parameters(params): Parameters<history::GetRankedSummaryParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("get_ranked_summary", &context);
        history::get_ranked_summary(&self.app, &self.json_payloads, params).await
    }

    #[tool(
        description = "Get match history summaries for a PUUID using the available match history API.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_match_summaries(
        &self,
        Parameters(params): Parameters<history::GetMatchSummariesParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("get_match_summaries", &context);
        history::get_match_summaries(&self.app, &self.json_payloads, params).await
    }

    #[tool(
        description = "Get one match summary by game id using the available match history API. Large results are returned as queryable JSON payload handles.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_match_summary(
        &self,
        Parameters(params): Parameters<history::GetMatchSummaryParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("get_match_summary", &context);
        history::get_match_summary(&self.app, &self.json_payloads, params).await
    }

    #[tool(
        description = "Get one match details payload by game id using the available match history API. Large results are returned as queryable JSON payload handles.",
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_match_details(
        &self,
        Parameters(params): Parameters<history::GetMatchDetailsParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        self.record_tool_call("get_match_details", &context);
        history::get_match_details(&self.app, &self.json_payloads, params).await
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

pub(super) async fn clear_call_records(
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
        Some((endpoint, clients, call_records)) => {
            calls::clear_call_records(&call_records).await;
            McpServerStateDto::running(
                endpoint,
                clients::clients_snapshot(&clients).await,
                calls::call_records_snapshot(&call_records).await,
            )
        }
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
    let json_payloads = payload_store::new_store();
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
    let service_json_payloads = json_payloads.clone();
    let service = StreamableHttpService::new(
        move || {
            Ok(LeagueJaxMcpServer::new(
                service_app.clone(),
                service_endpoint.clone(),
                service_clients.clone(),
                service_call_records.clone(),
                service_json_payloads.clone(),
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
        json_payloads,
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
    payload_store::clear_payloads(&server.json_payloads).await;
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
