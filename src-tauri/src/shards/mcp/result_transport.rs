use rmcp::model::CallToolResult;
use serde::Serialize;
use serde_json::json;

use super::payload_store::{self, McpJsonPayloadStore};

const INLINE_JSON_BUDGET_BYTES: usize = 64 * 1024;

pub(in crate::shards::mcp) async fn emit_json_result<T: Serialize>(
    store: &McpJsonPayloadStore,
    label: Option<String>,
    value: T,
) -> Result<CallToolResult, String> {
    let value = serde_json::to_value(value).map_err(|error| error.to_string())?;
    let estimated_bytes = payload_store::estimate_value_bytes(&value)?;

    if estimated_bytes <= INLINE_JSON_BUDGET_BYTES {
        return Ok(CallToolResult::structured(json!({
            "kind": "inlineJson",
            "estimatedBytes": estimated_bytes,
            "data": value
        })));
    }

    let result = payload_store::put_payload(store, value, label).await?;
    Ok(CallToolResult::structured(json!({
        "kind": "queryablePayload",
        "reason": "resultExceededInlineBudget",
        "inlineBudgetBytes": INLINE_JSON_BUDGET_BYTES,
        "payload": result.payload,
        "pointerSyntax": result.pointer_syntax,
        "next": {
            "describeTool": result.describe_tool,
            "queryTool": result.query_tool,
            "dropTool": "drop_json_payload"
        }
    })))
}
