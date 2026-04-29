use core::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use tauri::Emitter;

use crate::error::AppError;
use crate::shards::lcu::manager::LcuManagerStateEvent;
use crate::shards::lcu::LcuShard;
use crate::shards::ongoing_game::OngoingGameShard;
use crate::shards::sgp::SgpShard;
use crate::shards::tauri_host::TauriHost;
use crate::utils::http_json::{pretty_json, redact_sensitive_json};

pub struct LeagueBridgeShard;

impl LeagueBridgeShard {
    pub fn new() -> Self {
        Self
    }

    fn setup_runtime_bridge(&self, jax: Arc<Jax>) -> Result<(), AppError> {
        let tauri_host = jax.get_shard::<TauriHost>();
        let cancel_token = tauri_host.cancellation_token();

        let lcu_shard = jax.get_shard::<LcuShard>();
        let lcu_manager = lcu_shard.initialize(cancel_token.clone())?;

        let manager_for_run = lcu_manager.clone();
        tauri_host.spawn(async move {
            manager_for_run.run().await;
        });

        if let Some(ongoing_manager) = jax.get_shard::<OngoingGameShard>().manager() {
            ongoing_manager.start(&lcu_shard);
        }

        lcu_manager.subscribe_ws_fn(move |ws_event| {
            async move {
                if !tracing::enabled!(tracing::Level::DEBUG) {
                    return;
                }

                match serde_json::to_value(&ws_event) {
                    Ok(mut value) => {
                        redact_sensitive_json(&mut value);
                        tracing::debug!(
                            channel = "lcu-ws-raw",
                            "[lcu-ws-raw] {}",
                            pretty_json(&value)
                        );
                    }
                    Err(error) => {
                        tracing::warn!(error = %error, "Failed to serialize LCU websocket event for raw logging");
                    }
                }
            }
        });

        Ok(())
    }

    fn setup_emit_bridge(&self, jax: Arc<Jax>) -> Result<(), AppError> {
        let app = jax.get_shard::<TauriHost>().app.clone();
        let cancel_token = jax.get_shard::<TauriHost>().cancellation_token();

        let lcu_manager = jax
            .get_shard::<LcuShard>()
            .manager()
            .ok_or(AppError::LcuNotConnected)?;

        let state_app = app.clone();
        lcu_manager.clone().subscribe_state_fn(move |event| {
            let app = state_app.clone();
            async move {
                match event {
                    LcuManagerStateEvent::FocusChanged(change) => {
                        let _ = app.emit("lcu-focus-changed", change);
                    }
                    LcuManagerStateEvent::InstancesChanged(snapshot) => {
                        let _ = app.emit("lcu-instances-changed", snapshot);
                    }
                }
            }
        });

        if let Some(ongoing_manager) = jax.get_shard::<OngoingGameShard>().manager() {
            let mut ongoing_rx = ongoing_manager.subscribe();
            let ongoing_app = app.clone();
            let token = cancel_token.clone();

            tokio::spawn(async move {
                loop {
                    let event = tokio::select! {
                        _ = token.cancelled() => break,
                        result = ongoing_rx.recv() => {
                            match result {
                                Ok(ev) => ev,
                                Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                                    tracing::warn!(
                                        "[league_bridge] ongoing-game broadcast lagged, skipped {n} events"
                                    );
                                    continue;
                                },
                                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                            }
                        }
                    };

                    use crate::shards::ongoing_game::types::OngoingGameEvent;
                    match &event {
                        OngoingGameEvent::Updated(data) => {
                            let _ = ongoing_app.emit("ongoing-game-updated", data);
                        }
                        OngoingGameEvent::SummonersUpdated(data) => {
                            let _ = ongoing_app.emit("ongoing-game-summoners-updated", data);
                        }
                        OngoingGameEvent::MatchHistoriesUpdated(data) => {
                            let _ = ongoing_app.emit("ongoing-game-match-histories-updated", data);
                        }
                    }
                }
            });
        }

        Ok(())
    }
}

#[async_trait]
impl Shard for LeagueBridgeShard {
    shard_id!("bb42f197-0ea8-46f8-9f88-fa5652e08547");
    depends![TauriHost, LcuShard, OngoingGameShard, SgpShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.setup_runtime_bridge(jax.clone())?;
        self.setup_emit_bridge(jax)?;
        Ok(())
    }
}
