use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::Duration;

use rmcp::model::Extensions;
use serde::Serialize;
use tauri::Emitter;
use time::OffsetDateTime;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time::sleep;
use tokio_util::sync::CancellationToken;
use ts_rs::TS;
use uuid::Uuid;

use super::calls::{call_records_snapshot, McpCallRecordDto, McpCallRecords};

pub const MCP_SERVER_STATE_CHANGED_EVENT: &str = "mcp_server_state_changed";
const MCP_CLIENT_STALE_AFTER_MS: u64 = 120_000;
const MCP_CLIENT_PRUNE_INTERVAL_MS: u64 = 15_000;

pub(super) type McpClients = Arc<Mutex<BTreeMap<String, McpClientDto>>>;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "mcp.ts")]
#[serde(rename_all = "camelCase")]
pub struct McpClientDto {
    pub session_id: String,
    pub client_name: String,
    pub client_version: String,
    pub connected_at: u64,
    pub last_seen_at: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "mcp.ts")]
#[serde(rename_all = "camelCase")]
pub struct McpServerStateDto {
    pub running: bool,
    pub endpoint: Option<String>,
    pub clients: Vec<McpClientDto>,
    pub call_records: Vec<McpCallRecordDto>,
}

impl McpServerStateDto {
    pub(super) fn stopped() -> Self {
        Self {
            running: false,
            endpoint: None,
            clients: Vec::new(),
            call_records: Vec::new(),
        }
    }

    pub(super) fn running(
        endpoint: String,
        clients: Vec<McpClientDto>,
        call_records: Vec<McpCallRecordDto>,
    ) -> Self {
        Self {
            running: true,
            endpoint: Some(endpoint),
            clients,
            call_records,
        }
    }
}

pub(super) struct McpClientIdentity {
    pub session_id: String,
    pub client_name: String,
    pub client_version: String,
}

pub(super) fn new_clients() -> McpClients {
    Arc::new(Mutex::new(BTreeMap::new()))
}

pub(super) async fn clients_snapshot(clients: &McpClients) -> Vec<McpClientDto> {
    let mut clients = clients.lock().await.values().cloned().collect::<Vec<_>>();
    clients.sort_by_key(|client| (client.connected_at, client.session_id.clone()));
    clients
}

pub(super) fn emit_state_changed(app: &tauri::AppHandle, state: &McpServerStateDto) {
    if let Err(error) = app.emit(MCP_SERVER_STATE_CHANGED_EVENT, state) {
        tracing::warn!(error = %error, "Failed to emit MCP server state");
    }
}

pub(super) async fn emit_running_state(
    app: &tauri::AppHandle,
    endpoint: String,
    clients: &McpClients,
    call_records: &McpCallRecords,
) {
    let state = McpServerStateDto::running(
        endpoint,
        clients_snapshot(clients).await,
        call_records_snapshot(call_records).await,
    );
    emit_state_changed(app, &state);
}

/// Many Streamable HTTP clients do not explicitly close sessions on process exit.
pub(super) fn start_client_prune_task(
    app: tauri::AppHandle,
    endpoint: String,
    clients: McpClients,
    call_records: McpCallRecords,
    cancel_token: CancellationToken,
) -> JoinHandle<()> {
    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = cancel_token.cancelled() => {
                    break;
                }
                _ = sleep(Duration::from_millis(MCP_CLIENT_PRUNE_INTERVAL_MS)) => {
                    if prune_stale_clients(&clients).await {
                        emit_running_state(&app, endpoint.clone(), &clients, &call_records).await;
                    }
                }
            }
        }
    })
}

/// Streamable HTTP initialization can happen before the client receives a session header.
pub(super) async fn register_client_connected(
    app: &tauri::AppHandle,
    endpoint: &str,
    clients: &McpClients,
    call_records: &McpCallRecords,
    extensions: &Extensions,
    client_info: Option<&rmcp::model::ClientInfo>,
) -> McpClientIdentity {
    let session_id = session_id_from_extensions(extensions)
        .unwrap_or_else(|| format!("pending-{}", Uuid::now_v7()));
    let (client_name, client_version) = client_identity(client_info);
    upsert_client(
        clients,
        session_id.clone(),
        client_name.clone(),
        client_version.clone(),
    )
    .await;

    emit_running_state(app, endpoint.to_string(), clients, call_records).await;
    McpClientIdentity {
        session_id,
        client_name,
        client_version,
    }
}

/// Tool calls keep the session visible without blocking the synchronous tool response path.
pub(super) async fn upsert_client(
    clients: &McpClients,
    session_id: String,
    client_name: String,
    client_version: String,
) {
    let now = u64::try_from(OffsetDateTime::now_utc().unix_timestamp())
        .unwrap_or_default()
        .saturating_mul(1000);
    let mut guard = clients.lock().await;
    if !guard.contains_key(&session_id) {
        remove_matching_pending_client(&mut guard, &client_name, &client_version);
    }

    guard
        .entry(session_id.clone())
        .and_modify(|client| {
            client.client_name = client_name.clone();
            client.client_version = client_version.clone();
            client.last_seen_at = now;
        })
        .or_insert_with(|| McpClientDto {
            session_id,
            client_name,
            client_version,
            connected_at: now,
            last_seen_at: now,
        });
}

async fn prune_stale_clients(clients: &McpClients) -> bool {
    let now = u64::try_from(OffsetDateTime::now_utc().unix_timestamp())
        .unwrap_or_default()
        .saturating_mul(1000);
    let min_last_seen = now.saturating_sub(MCP_CLIENT_STALE_AFTER_MS);
    let mut removed = Vec::new();

    {
        let mut guard = clients.lock().await;
        guard.retain(|session_id, client| {
            let keep = client.last_seen_at >= min_last_seen;
            if !keep {
                removed.push((session_id.clone(), client.client_name.clone()));
            }
            keep
        });
    }

    if removed.is_empty() {
        return false;
    }

    tracing::info!(
        removed = removed.len(),
        clients = ?removed,
        stale_after_ms = MCP_CLIENT_STALE_AFTER_MS,
        "Pruned stale MCP clients"
    );
    true
}

pub(super) fn client_identity(client_info: Option<&rmcp::model::ClientInfo>) -> (String, String) {
    let client = client_info.map(|info| &info.client_info);
    let client_name = non_empty_client_field(client.map(|client| &client.name))
        .unwrap_or_else(|| "Unknown MCP client".to_string());
    let client_version = non_empty_client_field(client.map(|client| &client.version))
        .unwrap_or_else(|| "unknown".to_string());

    (client_name, client_version)
}

pub(super) fn session_id_from_extensions(extensions: &Extensions) -> Option<String> {
    extensions
        .get::<axum::http::request::Parts>()
        .and_then(|parts| parts.headers.get("mcp-session-id"))
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

/// Rebind the initialization record once a later request carries the real session id.
fn remove_matching_pending_client(
    clients: &mut BTreeMap<String, McpClientDto>,
    client_name: &str,
    client_version: &str,
) {
    let key = clients.iter().find_map(|(session_id, client)| {
        if session_id.starts_with("pending-")
            && client.client_name == client_name
            && client.client_version == client_version
        {
            return Some(session_id.clone());
        }

        None
    });

    if let Some(key) = key {
        clients.remove(&key);
    }
}

fn non_empty_client_field(value: Option<&String>) -> Option<String> {
    let value = value?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_client(session_id: &str, name: &str, last_seen_at: u64) -> McpClientDto {
        McpClientDto {
            session_id: session_id.to_string(),
            client_name: name.to_string(),
            client_version: "test".to_string(),
            connected_at: last_seen_at,
            last_seen_at,
        }
    }

    #[tokio::test]
    async fn prune_stale_clients_removes_only_inactive_sessions() {
        let now = u64::try_from(OffsetDateTime::now_utc().unix_timestamp())
            .unwrap_or_default()
            .saturating_mul(1000);
        let stale_last_seen = now.saturating_sub(MCP_CLIENT_STALE_AFTER_MS + 1);
        let clients = new_clients();
        {
            let mut guard = clients.lock().await;
            guard.insert(
                "stale".to_string(),
                test_client("stale", "stale-client", stale_last_seen),
            );
            guard.insert(
                "recent".to_string(),
                test_client("recent", "recent-client", now),
            );
        }

        assert!(prune_stale_clients(&clients).await);

        let snapshot = clients_snapshot(&clients).await;
        assert_eq!(snapshot.len(), 1);
        assert_eq!(snapshot[0].session_id, "recent");
    }
}
