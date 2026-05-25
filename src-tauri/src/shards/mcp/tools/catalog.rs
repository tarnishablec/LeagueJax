use rmcp::model::{CallToolResult, Tool};
use serde::Serialize;
use serde_json::json;
use ts_rs::TS;

use crate::shards::mcp::payloads::transport;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "mcp.ts")]
#[serde(rename_all = "camelCase")]
pub struct McpToolDto {
    pub name: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub read_only_hint: Option<bool>,
    pub destructive_hint: Option<bool>,
    pub idempotent_hint: Option<bool>,
    pub open_world_hint: Option<bool>,
}

pub(in crate::shards::mcp) fn tools_to_dtos(tools: Vec<Tool>) -> Vec<McpToolDto> {
    tools.into_iter().map(tool_to_dto).collect()
}

pub(in crate::shards::mcp) fn list_jax_tools(tools: Vec<Tool>) -> Result<CallToolResult, String> {
    transport::inline_json_result(json!({
        "tools": tools_to_dtos(tools)
    }))
}

fn tool_to_dto(tool: Tool) -> McpToolDto {
    let annotations = tool.annotations;
    let title = tool
        .title
        .or_else(|| annotations.as_ref().and_then(|value| value.title.clone()));

    McpToolDto {
        name: tool.name.to_string(),
        title,
        description: tool.description.map(|value| value.to_string()),
        read_only_hint: annotations.as_ref().and_then(|value| value.read_only_hint),
        destructive_hint: annotations
            .as_ref()
            .and_then(|value| value.destructive_hint),
        idempotent_hint: annotations.as_ref().and_then(|value| value.idempotent_hint),
        open_world_hint: annotations.as_ref().and_then(|value| value.open_world_hint),
    }
}
