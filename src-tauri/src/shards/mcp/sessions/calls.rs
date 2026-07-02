use std::collections::VecDeque;
use std::sync::Arc;

use rmcp::service::{RequestContext, RoleServer};
use serde::Serialize;
use time::OffsetDateTime;
use tokio::sync::Mutex;
use ts_rs::TS;
use uuid::Uuid;

use super::clients::{self, McpClients};

const MCP_CALL_RECORD_LIMIT: usize = 100;
const MCP_PROTOCOL: &str = "MCP 2025-11-25";
const MCP_TRANSPORT: &str = "Streamable HTTP";

pub(in crate::shards::mcp) type McpCallRecords = Arc<Mutex<VecDeque<McpCallRecordDto>>>;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "mcp.ts")]
#[serde(rename_all = "camelCase")]
pub struct McpCallRecordDto {
    pub id: String,
    pub tool_name: String,
    pub client_name: String,
    pub client_version: String,
    pub session_id: Option<String>,
    pub called_at: u64,
    pub protocol: String,
    pub transport: String,
}

pub(in crate::shards::mcp) fn new_call_records() -> McpCallRecords {
    Arc::new(Mutex::new(VecDeque::new()))
}

pub(in crate::shards::mcp) async fn call_records_snapshot(
    call_records: &McpCallRecords,
) -> Vec<McpCallRecordDto> {
    call_records.lock().await.iter().cloned().collect()
}

pub(in crate::shards::mcp) async fn clear_call_records(call_records: &McpCallRecords) {
    call_records.lock().await.clear();
}

pub(in crate::shards::mcp) fn record_tool_call_from_context(
    app: &tauri::AppHandle,
    endpoint: &str,
    clients: &McpClients,
    call_records: &McpCallRecords,
    tool_name: &str,
    context: &RequestContext<RoleServer>,
) {
    let session_id = clients::session_id_from_extensions(&context.extensions);
    let (client_name, client_version) =
        clients::client_identity(context.peer.peer_info().as_deref());
    let tool_name = tool_name.to_string();
    let app = app.clone();
    let endpoint = endpoint.to_string();
    let clients = clients.clone();
    let call_records = call_records.clone();

    tauri::async_runtime::spawn(async move {
        if let Some(session_id) = session_id.as_ref() {
            clients::upsert_client(
                &clients,
                session_id.clone(),
                client_name.clone(),
                client_version.clone(),
            )
            .await;
        }

        push_call_record(
            &call_records,
            McpCallRecordDto {
                id: Uuid::now_v7().to_string(),
                tool_name,
                client_name,
                client_version,
                session_id,
                called_at: u64::try_from(OffsetDateTime::now_utc().unix_timestamp())
                    .unwrap_or_default()
                    .saturating_mul(1000),
                protocol: MCP_PROTOCOL.to_string(),
                transport: MCP_TRANSPORT.to_string(),
            },
        )
        .await;

        clients::emit_running_state(&app, endpoint, &clients, &call_records).await;
    });
}

async fn push_call_record(call_records: &McpCallRecords, record: McpCallRecordDto) {
    let mut guard = call_records.lock().await;
    guard.push_front(record);
    guard.truncate(MCP_CALL_RECORD_LIMIT);
}
