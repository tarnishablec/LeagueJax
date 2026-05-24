use rmcp::model::CallToolResult;
use rmcp::schemars;
use serde::Deserialize;

use crate::commands;
use crate::shards::mcp::payload_store::McpJsonPayloadStore;

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

#[derive(Debug, Clone, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct ResolveSgpServerIdsParams {
    pub query: String,
}

pub(in crate::shards::mcp) async fn get_current_summoner(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        Some("get_current_summoner".to_string()),
        commands::history::get_current_summoner(jax).await,
    )
    .await
}

pub(in crate::shards::mcp) async fn get_current_sgp_server_id(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        Some("get_current_sgp_server_id".to_string()),
        commands::history::get_current_sgp_server_id(jax).await,
    )
    .await
}

pub(in crate::shards::mcp) async fn resolve_sgp_server_ids(
    store: &McpJsonPayloadStore,
    params: ResolveSgpServerIdsParams,
) -> Result<CallToolResult, String> {
    structured_result(
        store,
        Some("resolve_sgp_server_ids".to_string()),
        commands::history::resolve_sgp_server_ids(params.query).await,
    )
    .await
}

pub(in crate::shards::mcp) async fn search_summoner(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    params: SearchSummonerParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        Some("search_summoner".to_string()),
        commands::history::search_summoner(params.game_name, params.tag_line, jax).await,
    )
    .await
}

pub(in crate::shards::mcp) async fn search_summoners(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    params: SearchSummonersParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        Some("search_summoners".to_string()),
        commands::history::search_summoners(params.query, params.sgp_server_id, jax).await,
    )
    .await
}

pub(in crate::shards::mcp) async fn get_summoner_by_puuid(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    params: GetSummonerByPuuidParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        Some("get_summoner_by_puuid".to_string()),
        commands::history::get_summoner_by_puuid(params.puuid, params.sgp_server_id, jax).await,
    )
    .await
}

pub(in crate::shards::mcp) async fn get_ranked_summary(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    params: GetRankedSummaryParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
        Some("get_ranked_summary".to_string()),
        commands::history::get_ranked_summary(params.puuid, jax).await,
    )
    .await
}

pub(in crate::shards::mcp) async fn get_match_summaries(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    params: GetMatchSummariesParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        store,
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

pub(in crate::shards::mcp) async fn get_match_summary(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    params: GetMatchSummaryParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    let game_id = params.game_id;
    structured_result(
        store,
        Some(format!("get_match_summary:{game_id}")),
        commands::history::get_match_summary(game_id, params.sgp_server_id, jax).await,
    )
    .await
}

pub(in crate::shards::mcp) async fn get_match_details(
    app: &tauri::AppHandle,
    store: &McpJsonPayloadStore,
    params: GetMatchDetailsParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    let game_id = params.game_id;
    structured_result(
        store,
        Some(format!("get_match_details:{game_id}")),
        commands::history::get_match_details(game_id, params.sgp_server_id, jax).await,
    )
    .await
}
