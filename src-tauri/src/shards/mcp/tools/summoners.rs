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
pub(in crate::shards::mcp) struct SearchSummonerParams {
    pub game_name: String,
    pub tag_line: String,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct SearchSummonersParams {
    pub query: String,
    pub sgp_server_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct GetSummonerByPuuidParams {
    pub puuid: String,
    pub sgp_server_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct GetRankedSummaryParams {
    pub puuid: String,
}

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct ResolveSgpServerIdsParams {
    pub query: String,
}

#[tool_router(router = summoners_tool_router, vis = "pub(in crate::shards::mcp)")]
impl LeagueJaxMcpServer {
    #[tool(
        description = "Get the summoner profile for the focused League client session.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_current_summoner(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        get_current_summoner_result(self.app(), self.json_payloads(), &session_id).await
    }

    #[tool(
        description = "Get the SGP server id for the focused League client session.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_current_sgp_server_id(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        get_current_sgp_server_id_result(self.app(), self.json_payloads(), &session_id).await
    }

    #[tool(
        description = "Resolve a human server name or server id to matching SGP server ids.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn resolve_sgp_server_ids(
        &self,
        Parameters(params): Parameters<ResolveSgpServerIdsParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        resolve_sgp_server_ids_result(self.json_payloads(), &session_id, params).await
    }

    #[tool(
        description = "Search one summoner by exact Riot ID gameName and tagLine.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn search_summoner(
        &self,
        Parameters(params): Parameters<SearchSummonerParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        search_summoner_result(self.app(), self.json_payloads(), &session_id, params).await
    }

    #[tool(
        description = "Search summoners by PUUID, exact Riot ID, or fuzzy name on an optional SGP server.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn search_summoners(
        &self,
        Parameters(params): Parameters<SearchSummonersParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        search_summoners_result(self.app(), self.json_payloads(), &session_id, params).await
    }

    #[tool(
        description = "Get a summoner profile by PUUID on an optional SGP server.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_summoner_by_puuid(
        &self,
        Parameters(params): Parameters<GetSummonerByPuuidParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        get_summoner_by_puuid_result(self.app(), self.json_payloads(), &session_id, params).await
    }

    #[tool(
        description = "Get ranked stats for a summoner PUUID from the focused League client session.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_ranked_summary(
        &self,
        Parameters(params): Parameters<GetRankedSummaryParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        get_ranked_summary_result(self.app(), self.json_payloads(), &session_id, params).await
    }
}

async fn get_current_summoner_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        session_id,
        Some("get_current_summoner".to_string()),
        commands::history::get_current_summoner(jax).await,
    )
    .await
}

async fn get_current_sgp_server_id_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        session_id,
        Some("get_current_sgp_server_id".to_string()),
        commands::history::get_current_sgp_server_id(jax).await,
    )
    .await
}

async fn resolve_sgp_server_ids_result(
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: ResolveSgpServerIdsParams,
) -> Result<CallToolResult, String> {
    structured_result(
        store,
        session_id,
        Some("resolve_sgp_server_ids".to_string()),
        commands::history::resolve_sgp_server_ids(params.query).await,
    )
    .await
}

async fn search_summoner_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: SearchSummonerParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        session_id,
        Some("search_summoner".to_string()),
        commands::history::search_summoner(params.game_name, params.tag_line, jax).await,
    )
    .await
}

async fn search_summoners_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: SearchSummonersParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        session_id,
        Some("search_summoners".to_string()),
        commands::history::search_summoners(params.query, params.sgp_server_id, jax).await,
    )
    .await
}

async fn get_summoner_by_puuid_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: GetSummonerByPuuidParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        session_id,
        Some("get_summoner_by_puuid".to_string()),
        commands::history::get_summoner_by_puuid(params.puuid, params.sgp_server_id, jax).await,
    )
    .await
}

async fn get_ranked_summary_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: GetRankedSummaryParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        session_id,
        Some("get_ranked_summary".to_string()),
        commands::history::get_ranked_summary(params.puuid, jax).await,
    )
    .await
}
