use std::sync::Arc;

use jax::Jax;
use rmcp::model::CallToolResult;
use rmcp::schemars;
use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::commands;
use crate::error::AppError;

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

/// MCP tools intentionally call Tauri command functions so commands remain the shared public boundary.
fn jax_state(app: &tauri::AppHandle) -> Result<tauri::State<'_, Arc<Jax>>, String> {
    app.try_state::<Arc<Jax>>()
        .ok_or_else(|| "Jax state is not available".to_string())
}

fn structured_result<T: Serialize>(result: Result<T, AppError>) -> Result<CallToolResult, String> {
    let value = result.map_err(|error| error.to_string())?;
    serde_json::to_value(value)
        .map(CallToolResult::structured)
        .map_err(|error| error.to_string())
}

pub(in crate::shards::mcp) async fn get_current_summoner(
    app: &tauri::AppHandle,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(commands::history::get_current_summoner(jax).await)
}

pub(in crate::shards::mcp) async fn get_current_sgp_server_id(
    app: &tauri::AppHandle,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(commands::history::get_current_sgp_server_id(jax).await)
}

pub(in crate::shards::mcp) async fn resolve_sgp_server_ids(
    params: ResolveSgpServerIdsParams,
) -> Result<CallToolResult, String> {
    structured_result(commands::history::resolve_sgp_server_ids(params.query).await)
}

pub(in crate::shards::mcp) async fn search_summoner(
    app: &tauri::AppHandle,
    params: SearchSummonerParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        commands::history::search_summoner(params.game_name, params.tag_line, jax).await,
    )
}

pub(in crate::shards::mcp) async fn search_summoners(
    app: &tauri::AppHandle,
    params: SearchSummonersParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        commands::history::search_summoners(params.query, params.sgp_server_id, jax).await,
    )
}

pub(in crate::shards::mcp) async fn get_summoner_by_puuid(
    app: &tauri::AppHandle,
    params: GetSummonerByPuuidParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        commands::history::get_summoner_by_puuid(params.puuid, params.sgp_server_id, jax).await,
    )
}

pub(in crate::shards::mcp) async fn get_ranked_summary(
    app: &tauri::AppHandle,
    params: GetRankedSummaryParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(commands::history::get_ranked_summary(params.puuid, jax).await)
}

pub(in crate::shards::mcp) async fn get_match_summaries(
    app: &tauri::AppHandle,
    params: GetMatchSummariesParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        commands::history::get_match_summaries(
            params.puuid,
            params.begin_index,
            params.end_index,
            params.tag,
            params.sgp_server_id,
            jax,
        )
        .await,
    )
}

pub(in crate::shards::mcp) async fn get_match_summary(
    app: &tauri::AppHandle,
    params: GetMatchSummaryParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        commands::history::get_match_summary(params.game_id, params.sgp_server_id, jax).await,
    )
}

pub(in crate::shards::mcp) async fn get_match_details(
    app: &tauri::AppHandle,
    params: GetMatchDetailsParams,
) -> Result<CallToolResult, String> {
    let jax = jax_state(app)?;
    structured_result(
        commands::history::get_match_details(params.game_id, params.sgp_server_id, jax).await,
    )
}
