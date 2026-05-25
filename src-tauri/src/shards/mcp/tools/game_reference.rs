use rmcp::handler::server::wrapper::Parameters;
use rmcp::model::CallToolResult;
use rmcp::schemars;
use rmcp::service::{RequestContext, RoleServer};
use rmcp::{tool, tool_router};
use serde::Deserialize;

use crate::commands;
use crate::shards::lcu::concepts::rank;
use crate::shards::mcp::payloads::{store::McpJsonPayloadStore, transport};
use crate::shards::mcp::server::LeagueJaxMcpServer;

use super::{jax_state, structured_result};

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct GetLcuStaticJsonParams {
    pub table_id: Option<String>,
    pub path: Option<String>,
}

#[tool_router(router = game_reference_tool_router, vis = "pub(in crate::shards::mcp)")]
impl LeagueJaxMcpServer {
    #[tool(
        description = "List known LCU static JSON game reference tables. Use a returned tableId with get_lcu_static_json; path is an escape hatch for other /lol-game-data/assets/**/*.json files.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn list_lcu_static_json_tables(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        list_lcu_static_json_tables_result(self.json_payloads(), &session_id).await
    }

    #[tool(
        description = "Get one LCU static JSON table by tableId from list_lcu_static_json_tables, or by an explicit /lol-game-data/assets/**/*.json path. Large results are returned as session-owned JSON payload handles.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    async fn get_lcu_static_json(
        &self,
        Parameters(params): Parameters<GetLcuStaticJsonParams>,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        get_lcu_static_json_result(self.app(), self.json_payloads(), &session_id, params).await
    }

    #[tool(
        description = "Get League queue metadata from the available game data source.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = true
        )
    )]
    async fn get_queues(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResult, String> {
        let session_id = self.session_id_from_checked_context(&context)?;
        get_queues_result(self.app(), self.json_payloads(), &session_id).await
    }

    #[tool(
        description = "Get the LeagueJax internal rank-to-MMR reference scale for rough rank-equivalent analysis. This is a community heuristic, not Riot's hidden MMR.",
        output_schema = transport::json_result_output_schema(),
        annotations(
            read_only_hint = true,
            destructive_hint = false,
            open_world_hint = false
        )
    )]
    fn get_mmr_reference_scale(&self) -> Result<CallToolResult, String> {
        get_mmr_reference_scale_result()
    }
}

async fn list_lcu_static_json_tables_result(
    store: &McpJsonPayloadStore,
    session_id: &str,
) -> Result<CallToolResult, String> {
    structured_result(
        store,
        session_id,
        Some("list_lcu_static_json_tables".to_string()),
        commands::game_reference::list_lcu_static_json_tables(),
    )
    .await
}

async fn get_lcu_static_json_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
    params: GetLcuStaticJsonParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    let label = commands::game_reference::lcu_static_json_result_label(
        params.table_id.as_deref(),
        params.path.as_deref(),
    );

    structured_result(
        store,
        session_id,
        Some(label),
        commands::game_reference::get_lcu_static_json(params.table_id, params.path, jax).await,
    )
    .await
}

async fn get_queues_result(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    session_id: &str,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        session_id,
        Some("get_queues".to_string()),
        commands::map::lcu_get_queues(None, None, jax).await,
    )
    .await
}

fn get_mmr_reference_scale_result() -> Result<CallToolResult, String> {
    transport::inline_json_result(rank::mmr_reference_scale())
}
