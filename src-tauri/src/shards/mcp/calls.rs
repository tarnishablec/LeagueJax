use std::collections::VecDeque;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use rmcp::service::{RequestContext, RoleServer};
use serde::Serialize;
use tokio::sync::Mutex;
use ts_rs::TS;
use uuid::Uuid;

use super::clients::{self, McpClients};

const MCP_CALL_RECORD_LIMIT: usize = 100;
const MCP_PROTOCOL: &str = "MCP 2024-11-05";
const MCP_TRANSPORT: &str = "Streamable HTTP";

pub(super) type McpCallRecords = Arc<Mutex<VecDeque<McpCallRecordDto>>>;

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

pub(super) fn new_call_records() -> McpCallRecords {
    Arc::new(Mutex::new(VecDeque::new()))
}

pub(super) async fn call_records_snapshot(call_records: &McpCallRecords) -> Vec<McpCallRecordDto> {
    call_records.lock().await.iter().cloned().collect()
}

pub(super) fn record_tool_call_from_context(
    app: &tauri::AppHandle,
    endpoint: &str,
    clients: &McpClients,
    call_records: &McpCallRecords,
    tool_name: &'static str,
    context: &RequestContext<RoleServer>,
) {
    let session_id = clients::session_id_from_extensions(&context.extensions);
    let (client_name, client_version) = clients::client_identity(context.peer.peer_info());
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
                tool_name: tool_name.to_string(),
                client_name,
                client_version,
                session_id,
                called_at: current_epoch_millis(),
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

fn current_epoch_millis() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => {
            let millis = duration.as_millis();
            if millis > u128::from(u64::MAX) {
                u64::MAX
            } else {
                millis as u64
            }
        }
        Err(_) => 0,
    }
}
