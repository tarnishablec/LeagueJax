use core::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, JaxResult, Shard};
use tauri::Emitter;
use tokio::sync::broadcast::error::RecvError;

use crate::error::AppError;
use crate::shards::settings::SettingsShard;
use crate::shards::tauri_host::TauriHost;

pub struct SettingsBridgeShard;

impl SettingsBridgeShard {
    pub fn new() -> Self {
        Self
    }

    fn setup_emit_bridge(&self, jax: Arc<Jax>) -> Result<(), AppError> {
        let tauri_host = jax.get_shard::<TauriHost>();
        let app = tauri_host.app.clone();
        let mut changes_rx = jax.get_shard::<SettingsShard>().subscribe_changes();
        let mut definitions_rx = jax
            .get_shard::<SettingsShard>()
            .subscribe_definitions_changes();

        tauri_host.spawn(async move {
            loop {
                match changes_rx.recv().await {
                    Ok(payload) => {
                        let _ = app.emit("settings_changed", payload);
                    }
                    Err(RecvError::Lagged(skipped)) => {
                        tracing::warn!(
                            skipped,
                            "[settings_bridge] settings change broadcast lagged"
                        );
                    }
                    Err(RecvError::Closed) => break,
                }
            }
        });

        let app = tauri_host.app.clone();
        tauri_host.spawn(async move {
            loop {
                match definitions_rx.recv().await {
                    Ok(payload) => {
                        let _ = app.emit("settings_definitions_changed", payload);
                    }
                    Err(RecvError::Lagged(skipped)) => {
                        tracing::warn!(
                            skipped,
                            "[settings_bridge] settings definition broadcast lagged"
                        );
                    }
                    Err(RecvError::Closed) => break,
                }
            }
        });

        Ok(())
    }
}

#[async_trait]
impl Shard for SettingsBridgeShard {
    shard_id!("3c74c22b-b500-456c-8da7-81a1f1ddf75b");
    depends![TauriHost, SettingsShard];

    async fn setup(&self, jax: Arc<Jax>) -> JaxResult<()> {
        self.setup_emit_bridge(jax)?;
        Ok(())
    }
}
