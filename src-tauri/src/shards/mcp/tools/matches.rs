use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::CallToolResult;
use rmcp::schemars;
use rmcp::service::{RequestContext, RoleServer};
use rmcp::{tool, tool_router};
use serde::Deserialize;

use crate::commands;
use crate::shards::mcp::payloads::{store::McpJsonPayloadStore, transport};
use crate::shards::mcp::server::LeagueJaxMcpServer;

use super::{jax_state, structured_result};

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct GetMatchSummariesParams {
    pub puuid: String,
    pub begin_index: u32,
    pub end_index: u32,
    pub tag: Option<String>,
    pub queue_id: Option<i64>,
    pub sgp_server_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct GetMatchSummaryParams {
    pub game_id: u64,
    pub sgp_server_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct GetMatchDetailsParams {
    pub game_id: u64,
    pub sgp_server_id: Option<String>,
}

#[tool_router(router = matches_tool_router, vis = "pub(in crate::shards::mcp)")]
impl LeagueJaxMcpServer {
    #[tool(
        description = "Get match history summaries for a PUUID using the available match history API. Pass queueId from get_queues to fetch a server-filtered queue page; beginIndex/endIndex then apply within that queue result set.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_match_summaries(
        &self,
        Parameters(params): Parameters<GetMatchSummariesParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.require_session_id(&context)?;
        self.record_tool_call("get_match_summaries", &context);
        get_match_summaries_result(self.app(), self.json_payloads(), &session_id, params).await
    }

    #[tool(
        description = "Get one match summary by game id using the available match history API. Large results are returned as session-owned JSON payload handles.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_match_summary(
        &self,
        Parameters(params): Parameters<GetMatchSummaryParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.require_session_id(&context)?;
        self.record_tool_call("get_match_summary", &context);
        get_match_summary_result(self.app(), self.json_payloads(), &session_id, params).await
    }

    #[tool(
        description = "Get one match details payload by game id using the available match history API. Large results are returned as session-owned JSON payload handles.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_match_details(
        &self,
        Parameters(params): Parameters<GetMatchDetailsParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.require_session_id(&context)?;
        self.record_tool_call("get_match_details", &context);
        get_match_details_result(self.app(), self.json_payloads(), &session_id, params).await
    }
}

async fn get_match_summaries_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: GetMatchSummariesParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        session_id,
        Some("get_match_summaries".to_string()),
        commands::history::get_match_summaries(
            params.puuid,
            params.begin_index,
            params.end_index,
            params.tag,
            params.queue_id,
            params.sgp_server_id,
            jax,
        )
        .await,
    )
    .await
}

async fn get_match_summary_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: GetMatchSummaryParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    let game_id = params.game_id;
    structured_result(
        store,
        session_id,
        Some(format!("get_match_summary:{game_id}")),
        commands::history::get_match_summary(game_id, params.sgp_server_id, jax).await,
    )
    .await
}

async fn get_match_details_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: GetMatchDetailsParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    let game_id = params.game_id;
    structured_result(
        store,
        session_id,
        Some(format!("get_match_details:{game_id}")),
        commands::history::get_match_details(game_id, params.sgp_server_id, jax).await,
    )
    .await
}
