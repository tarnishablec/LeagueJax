use std::sync::Arc;

use rmcp::model::{CallToolResult, Content, JsonObject};
use rmcp::schemars;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::store::{self, McpJsonPayloadStore};

const INLINE_JSON_BUDGET_BYTES: usize = 64 * 1024;

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase", untagged)]
pub(in crate::shards::mcp) enum JsonResultEnvelopeSchema {
    Inline(InlineJsonResultSchema),
    Payload(PayloadJsonResultSchema),
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct InlineJsonResultSchema {
    pub kind: InlineResultKind,
    pub estimated_bytes: usize,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct PayloadJsonResultSchema {
    pub kind: PayloadResultKind,
    pub reason: String,
    pub inline_budget_bytes: usize,
    pub payload: JsonPayloadMetadataSchema,
    pub pointer_syntax: String,
    pub next: JsonPayloadNextSchema,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct JsonPayloadMetadataSchema {
    pub payload_id: String,
    pub label: Option<String>,
    pub created_at_ms: u64,
    pub expires_at_ms: u64,
    pub estimated_bytes: usize,
    pub root_type: String,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct JsonPayloadNextSchema {
    pub describe_tool: String,
    pub query_tool: String,
    pub drop_tool: String,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) enum InlineResultKind {
    #[serde(rename = "inline")]
    Inline,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) enum PayloadResultKind {
    #[serde(rename = "payload")]
    Payload,
}

pub(in crate::shards::mcp) fn json_result_output_schema() -> Arc<JsonObject> {
    let _schema_field_use_marker: fn(&JsonResultEnvelopeSchema) = mark_schema_fields_as_used;
    rmcp::handler::server::tool::schema_for_type::<JsonResultEnvelopeSchema>()
}

// These types exist to generate the MCP outputSchema and are not materialized at runtime.
fn mark_schema_fields_as_used(value: &JsonResultEnvelopeSchema) {
    match value {
        JsonResultEnvelopeSchema::Inline(inline) => {
            let _ = (&inline.kind, inline.estimated_bytes, &inline.data);
        }
        JsonResultEnvelopeSchema::Payload(payload) => {
            let _ = (
                &payload.kind,
                &payload.reason,
                payload.inline_budget_bytes,
                &payload.pointer_syntax,
            );
            let _ = (
                &payload.payload.payload_id,
                &payload.payload.label,
                payload.payload.created_at_ms,
                payload.payload.expires_at_ms,
                payload.payload.estimated_bytes,
                &payload.payload.root_type,
            );
            let _ = (
                &payload.next.describe_tool,
                &payload.next.query_tool,
                &payload.next.drop_tool,
            );
        }
    }
}

pub(in crate::shards::mcp) fn inline_json_result<T: Serialize>(
    value: T,
) -> Result<CallToolResult, String> {
    let value = serde_json::to_value(value).map_err(|error| error.to_string())?;
    let estimated_bytes = store::estimate_value_bytes(&value)?;

    Ok(structured_json_result(
        json!({
            "kind": "inline",
            "estimatedBytes": estimated_bytes,
            "data": value
        }),
        format!("LeagueJax MCP inline JSON result ({estimated_bytes} bytes)."),
    ))
}

pub(in crate::shards::mcp) async fn emit_json_result<T: Serialize>(
    store: &McpJsonPayloadStore,
    session_id: &str,
    label: Option<String>,
    value: T,
) -> Result<CallToolResult, String> {
    let value = serde_json::to_value(value).map_err(|error| error.to_string())?;
    let estimated_bytes = store::estimate_value_bytes(&value)?;

    if estimated_bytes <= INLINE_JSON_BUDGET_BYTES {
        return Ok(structured_json_result(
            json!({
                "kind": "inline",
                "estimatedBytes": estimated_bytes,
                "data": value
            }),
            format!("LeagueJax MCP inline JSON result ({estimated_bytes} bytes)."),
        ));
    }

    let result = store::put_payload(store, session_id, value, label).await?;
    let payload_id = result.payload.payload_id.clone();
    let payload_bytes = result.payload.estimated_bytes;
    Ok(structured_json_result(
        json!({
            "kind": "payload",
            "reason": "resultExceededInlineBudget",
            "inlineBudgetBytes": INLINE_JSON_BUDGET_BYTES,
            "payload": result.payload,
            "pointerSyntax": result.pointer_syntax,
            "next": {
                "describeTool": result.describe_tool,
                "queryTool": result.query_tool,
                "dropTool": "drop_json_payload"
            }
        }),
        format!("LeagueJax MCP JSON payload result: {payload_id} ({payload_bytes} bytes)."),
    ))
}

fn structured_json_result(value: serde_json::Value, summary: String) -> CallToolResult {
    let mut result = CallToolResult::success(vec![Content::text(summary)]);
    result.structured_content = Some(value);
    result
}
