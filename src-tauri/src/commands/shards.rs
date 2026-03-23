use crate::concepts::shards::{ShardInfoDto, ShardStatusDto, ShardsSnapshotDto};
use crate::error::AppError;
use jax::Jax;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn get_shards_status(
    jax: State<'_, Arc<Jax>>,
) -> Result<ShardsSnapshotDto, AppError> {
    Ok(build_shards_snapshot(&jax))
}

pub fn build_shards_snapshot(jax: &Jax) -> ShardsSnapshotDto {
    let all_shards = jax.list_shards();
    let report = jax.get_startup_report();

    let failed_ids: std::collections::HashSet<uuid::Uuid> = report
        .map(|r| r.failed_ids.iter().copied().collect())
        .unwrap_or_default();
    let skipped_ids: std::collections::HashSet<uuid::Uuid> = report
        .map(|r| r.skipped.iter().copied().collect())
        .unwrap_or_default();

    let shards = all_shards
        .into_iter()
        .map(|(id, label, dependencies)| {
            let status = if failed_ids.contains(&id) {
                ShardStatusDto::Failed {
                    error: "Setup failed".to_string(),
                }
            } else if skipped_ids.contains(&id) {
                ShardStatusDto::Skipped
            } else {
                ShardStatusDto::Running
            };

            let duration_ms = report
                .and_then(|r| r.durations.get(&id))
                .map(|d| d.as_secs_f64() * 1000.0);

            ShardInfoDto {
                id: id.to_string(),
                label,
                status,
                dependencies: dependencies.iter().map(|d| d.to_string()).collect(),
                setup_duration_ms: duration_ms,
            }
        })
        .collect();

    ShardsSnapshotDto { shards }
}
