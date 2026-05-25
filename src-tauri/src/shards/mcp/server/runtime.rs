use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;

use rmcp::transport::streamable_http_server::{
    session::local::LocalSessionManager, StreamableHttpServerConfig, StreamableHttpService,
};
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::shards::mcp::payloads::store::{self, McpJsonPayloadStore};
use crate::shards::mcp::sessions::calls::{self, McpCallRecords};
use crate::shards::mcp::sessions::clients::{self, McpClients, McpServerStateDto};

use super::LeagueJaxMcpServer;

const MCP_ROUTE: &str = "/mcp";

pub(in crate::shards::mcp) struct McpServerRuntime {
    pub endpoint: String,
    pub clients: McpClients,
    pub call_records: McpCallRecords,
    pub json_payloads: McpJsonPayloadStore,
    cancel_token: CancellationToken,
    task: JoinHandle<()>,
    prune_task: JoinHandle<()>,
}

async fn running_runtime_handles(
    runtime: &Arc<Mutex<Option<McpServerRuntime>>>,
) -> Option<(String, McpClients, McpCallRecords)> {
    let guard = runtime.lock().await;
    guard.as_ref().map(|server| {
        (
            server.endpoint.clone(),
            server.clients.clone(),
            server.call_records.clone(),
        )
    })
}

pub(in crate::shards::mcp) async fn server_state(
    runtime: &Arc<Mutex<Option<McpServerRuntime>>>,
) -> McpServerStateDto {
    match running_runtime_handles(runtime).await {
        Some((endpoint, clients, call_records)) => McpServerStateDto::running(
            endpoint,
            clients::clients_snapshot(&clients).await,
            calls::call_records_snapshot(&call_records).await,
        ),
        None => McpServerStateDto::stopped(),
    }
}

pub(in crate::shards::mcp) async fn clear_call_records(
    runtime: &Arc<Mutex<Option<McpServerRuntime>>>,
) -> McpServerStateDto {
    match running_runtime_handles(runtime).await {
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

pub(in crate::shards::mcp) fn endpoint_for_port(port: u16) -> String {
    format!("http://127.0.0.1:{port}{MCP_ROUTE}")
}

fn bind_address_for_port(port: u16) -> SocketAddr {
    SocketAddr::from((Ipv4Addr::LOCALHOST, port))
}

/// The MCP listener is loopback-only until auth/pairing is introduced.
pub(in crate::shards::mcp) async fn start_server(
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
    let json_payloads = store::new_store();
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

pub(in crate::shards::mcp) async fn stop_server(
    runtime: &Arc<Mutex<Option<McpServerRuntime>>>,
) -> Option<String> {
    let server = {
        let mut guard = runtime.lock().await;
        guard.take()
    };

    let server = server?;

    let endpoint = server.endpoint.clone();
    server.cancel_token.cancel();
    server.clients.lock().await.clear();
    server.call_records.lock().await.clear();
    store::clear_payloads(&server.json_payloads).await;
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
