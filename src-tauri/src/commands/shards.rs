use crate::error::AppError;
use crate::shards::shard_status_types::{ShardInfoDto, ShardStatusDto, ShardsSnapshotDto};
use jax::report::StartupReport;
use jax::{Jax, ShardId};
use jax_probes::TimingProbe;
use std::collections::{BTreeMap, BTreeSet};
use std::sync::{Arc, RwLock};
use tauri::State;

#[derive(Clone, Default)]
pub struct StartupReportState {
    inner: Arc<RwLock<Option<StartupReportSnapshot>>>,
}

#[derive(Clone, Default)]
struct StartupReportSnapshot {
    failed_errors: BTreeMap<ShardId, String>,
    skipped_ids: BTreeSet<ShardId>,
}

impl StartupReportState {
    pub fn set_report(&self, report: &StartupReport) -> Result<(), AppError> {
        let snapshot = StartupReportSnapshot {
            failed_errors: report
                .failed
                .iter()
                .map(|failure| (failure.id, failure.error.to_string()))
                .collect(),
            skipped_ids: report.skipped.iter().copied().collect(),
        };

        let mut guard = self.inner.write().map_err(|_| AppError::MutexPoisoned)?;
        *guard = Some(snapshot);
        Ok(())
    }

    fn snapshot(&self) -> StartupReportSnapshot {
        self.inner
            .read()
            .ok()
            .and_then(|guard| guard.clone())
            .unwrap_or_default()
    }
}

#[tauri::command]
pub async fn get_shards_status(
    jax: State<'_, Arc<Jax>>,
    timing: State<'_, Arc<TimingProbe>>,
    startup_report: State<'_, StartupReportState>,
) -> Result<ShardsSnapshotDto, AppError> {
    Ok(build_shards_snapshot(&jax, &timing, &startup_report))
}

pub fn build_shards_snapshot(
    jax: &Jax,
    timing: &TimingProbe,
    startup_report: &StartupReportState,
) -> ShardsSnapshotDto {
    let all_shards = jax.list_shards();
    let startup_report = startup_report.snapshot();
    let durations = timing.durations();

    let shards = all_shards
        .into_iter()
        .map(|(id, label, dependencies)| {
            let status = if let Some(error) = startup_report.failed_errors.get(&id) {
                ShardStatusDto::Failed {
                    error: error.clone(),
                }
            } else if startup_report.skipped_ids.contains(&id) {
                ShardStatusDto::Skipped
            } else {
                ShardStatusDto::Running
            };

            let duration_ms = durations.get(&id).map(|d| d.as_secs_f64() * 1000.0);

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
