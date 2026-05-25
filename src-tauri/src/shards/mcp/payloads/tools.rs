use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::CallToolResult;
use rmcp::schemars;
use rmcp::service::{RequestContext, RoleServer};
use rmcp::{tool, tool_router};
use serde::Deserialize;
use serde_json::json;

use crate::shards::mcp::payloads::store::{
    self, JsonPayloadDescription, JsonPointerQueryResponse, McpJsonPayloadStore,
};
use crate::shards::mcp::payloads::transport;
use crate::shards::mcp::server::LeagueJaxMcpServer;

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

#[tool_router(router = payloads_tool_router, vis = "pub(in crate::shards::mcp)")]
impl LeagueJaxMcpServer {
    #[tool(
        description = "List JSON payload handles currently held by this MCP session.",
        output_schema = transport::json_result_output_schema(),
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
        let session_id = self.require_session_id(&context)?;
        self.record_tool_call("list_json_payloads", &context);
        list_json_payloads_result(self.json_payloads(), &session_id).await
    }

    #[tool(
        description = "Describe the schema shape of a cached JSON payload without returning the full payload.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn describe_json_payload(
        &self,
        Parameters(params): Parameters<DescribeJsonPayloadParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.require_session_id(&context)?;
        self.record_tool_call("describe_json_payload", &context);
        describe_json_payload_result(self.json_payloads(), &session_id, params).await
    }

    #[tool(
        description = "Query selected values from a cached JSON payload using RFC 6901 JSON Pointers.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn query_json_payload_pointers(
        &self,
        Parameters(params): Parameters<QueryJsonPayloadPointersParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.require_session_id(&context)?;
        self.record_tool_call("query_json_payload_pointers", &context);
        query_json_payload_pointers_result(self.json_payloads(), &session_id, params).await
    }

    #[tool(
        description = "Release one transient cached JSON payload handle owned by this MCP session.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = false,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn drop_json_payload(
        &self,
        Parameters(params): Parameters<DropJsonPayloadParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.require_session_id(&context)?;
        self.record_tool_call("drop_json_payload", &context);
        drop_json_payload_result(self.json_payloads(), &session_id, params).await
    }
}

async fn list_json_payloads_result(
    store: &McpJsonPayloadStore,
    session_id: &str,
) -> Result<CallToolResult, String> {
    transport::inline_json_result(json!({
        "payloads": store::list_payloads(store, session_id).await
    }))
}

async fn describe_json_payload_result(
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: DescribeJsonPayloadParams,
) -> Result<CallToolResult, String> {
    let description: JsonPayloadDescription = store::describe_payload(
        store,
        session_id,
        &params.payload_id,
        params.max_depth,
        params.array_sample_size,
        params.object_key_limit,
    )
    .await?;
    transport::inline_json_result(description)
}

async fn query_json_payload_pointers_result(
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: QueryJsonPayloadPointersParams,
) -> Result<CallToolResult, String> {
    if params.pointers.is_empty() {
        return Err("At least one JSON Pointer is required".to_string());
    }

    let response: JsonPointerQueryResponse = store::query_pointers(
        store,
        session_id,
        &params.payload_id,
        &params.pointers,
        params.max_bytes,
    )
    .await?;
    transport::inline_json_result(response)
}

async fn drop_json_payload_result(
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: DropJsonPayloadParams,
) -> Result<CallToolResult, String> {
    let payload_id = params.payload_id;
    let dropped = store::drop_payload(store, session_id, &payload_id).await;
    transport::inline_json_result(json!({
        "payloadId": payload_id,
        "dropped": dropped
    }))
}
