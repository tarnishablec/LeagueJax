use rmcp::model::CallToolResult;
use rmcp::schemars;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::shards::mcp::payload_store::{
    self, JsonPayloadDescription, JsonPointerQueryResponse, McpJsonPayloadStore,
};

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct DescribeJsonPayloadParams {
    pub payload_id: String,
    pub max_depth: Option<u32>,
    pub array_sample_size: Option<u32>,
    pub object_key_limit: Option<u32>,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct QueryJsonPayloadPointersParams {
    pub payload_id: String,
    pub pointers: Vec<String>,
    pub max_bytes: Option<u32>,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct DropJsonPayloadParams {
    pub payload_id: String,
}

fn structured<T: Serialize>(value: T) -> Result<CallToolResult, String> {
    serde_json::to_value(value)
        .map(CallToolResult::structured)
        .map_err(|error| error.to_string())
}

pub(in crate::shards::mcp) async fn list_json_payloads(
    store: &McpJsonPayloadStore,
) -> Result<CallToolResult, String> {
    structured(json!({
        "payloads": payload_store::list_payloads(store).await
    }))
}

pub(in crate::shards::mcp) async fn describe_json_payload(
    store: &McpJsonPayloadStore,
    params: DescribeJsonPayloadParams,
) -> Result<CallToolResult, String> {
    let description: JsonPayloadDescription = payload_store::describe_payload(
        store,
        &params.payload_id,
        params.max_depth,
        params.array_sample_size,
        params.object_key_limit,
    )
    .await?;
    structured(description)
}

pub(in crate::shards::mcp) async fn query_json_payload_pointers(
    store: &McpJsonPayloadStore,
    params: QueryJsonPayloadPointersParams,
) -> Result<CallToolResult, String> {
    if params.pointers.is_empty() {
        return Err("At least one JSON Pointer is required".to_string());
    }

    let response: JsonPointerQueryResponse = payload_store::query_pointers(
        store,
        &params.payload_id,
        &params.pointers,
        params.max_bytes,
    )
    .await?;
    structured(response)
}

pub(in crate::shards::mcp) async fn drop_json_payload(
    store: &McpJsonPayloadStore,
    params: DropJsonPayloadParams,
) -> Result<CallToolResult, String> {
    structured(json!({
        "payloadId": params.payload_id,
        "dropped": payload_store::drop_payload(store, &params.payload_id).await
    }))
}
