use rmcp::model::CallToolResult;
use rmcp::service::{RequestContext, RoleServer};
use rmcp::{tool, tool_router};

use crate::commands;
use crate::shards::lcu::concepts::rank;
use crate::shards::mcp::payloads::{store::McpJsonPayloadStore, transport};
use crate::shards::mcp::server::LeagueJaxMcpServer;

use super::{jax_state, structured_result};

#[tool_router(router = game_reference_tool_router, vis = "pub(in crate::shards::mcp)")]
impl LeagueJaxMcpServer {
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
    ) -> Result<rmcp::model::CallToolResult, String> {
        let session_id = self.require_session_id(&context)?;
        self.record_tool_call("get_queues", &context);
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
    fn get_mmr_reference_scale(
        &self,
        context: RequestContext<RoleServer>,
    ) -> Result<rmcp::model::CallToolResult, String> {
        let _session_id = self.require_session_id(&context)?;
        self.record_tool_call("get_mmr_reference_scale", &context);
        get_mmr_reference_scale_result()
    }
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
