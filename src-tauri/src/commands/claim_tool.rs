use std::sync::Arc;

use jax::Jax;
use tauri::State;

use crate::error::AppError;
use crate::shards::claim_tool::types::{
    ClaimToolClaimRequestDto, ClaimToolClaimablesDto, ClaimToolRunResultDto, ClaimToolSnapshotDto,
};
use crate::shards::claim_tool::ClaimToolShard;

fn claim_tool_manager(
    jax: &Arc<Jax>,
) -> Result<crate::shards::claim_tool::ClaimToolManager, AppError> {
    jax.get_shard::<ClaimToolShard>()
        .manager()
        .ok_or_else(|| AppError::other("ClaimTool manager not initialized"))
}

#[tauri::command]
pub async fn claim_tool_get_snapshot(
    jax: State<'_, Arc<Jax>>,
) -> Result<ClaimToolSnapshotDto, AppError> {
    Ok(claim_tool_manager(&jax)?.snapshot())
}

#[tauri::command]
pub async fn claim_tool_refresh(
    jax: State<'_, Arc<Jax>>,
) -> Result<ClaimToolClaimablesDto, AppError> {
    claim_tool_manager(&jax)?.get_claimables().await
}

#[tauri::command]
pub async fn claim_tool_claim_all(
    jax: State<'_, Arc<Jax>>,
) -> Result<ClaimToolRunResultDto, AppError> {
    claim_tool_manager(&jax)?.claim_all().await
}

#[tauri::command]
pub async fn claim_tool_claim_selected(
    request: ClaimToolClaimRequestDto,
    jax: State<'_, Arc<Jax>>,
) -> Result<ClaimToolRunResultDto, AppError> {
    claim_tool_manager(&jax)?.claim_request(request).await
}
