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

pub struct LeagueBridgeShard;

impl LeagueBridgeShard {
    pub fn new() -> Self {
        Self
    }

    fn setup_runtime_bridge(&self, jax: Arc<Jax>) {
        let tauri_host = jax.get_shard::<TauriHost>();
        let cancel_token = tauri_host.cancellation_token();

        let lcu_shard = jax.get_shard::<LcuShard>();
        let lcu_manager = lcu_shard.initialize(cancel_token.clone());

        let ongoing_shard = jax.get_shard::<OngoingGameShard>();
        let Some(ongoing_manager) = ongoing_shard.manager() else {
            tracing::error!("OngoingGame manager is not initialized");
            return;
        };

        let manager_for_run = lcu_manager.clone();
        tauri_host.spawn(async move {
            manager_for_run.run().await;
        });

        let jax_for_state = jax.clone();
        let ongoing_shard_for_state = ongoing_shard.clone();
        lcu_manager.clone().subscribe_state_fn(move |event| {
            let jax = jax_for_state.clone();
            let ongoing_shard = ongoing_shard_for_state.clone();
            async move {
                match event {
                    LcuManagerStateEvent::FocusChanged(change) => {
                        let lcu_session = match change.current {
                            Some(pid) => {
                                let lcu_shard = jax.get_shard::<LcuShard>();
                                lcu_shard.manager().and_then(|m| m.session_for_pid(pid))
                            }
                            None => None,
                        };

                        ongoing_shard.apply_focus(lcu_session).await;
                    }
                    LcuManagerStateEvent::InstancesChanged(_) => {}
                }
            }
        });

        lcu_manager.subscribe_ws_fn(move |ws_event| {
            let ongoing_manager = ongoing_manager.clone();
            async move {
                match serde_json::to_string_pretty(&ws_event) {
                    Ok(pretty_json) => {
                        tracing::debug!(target: "lcu_ws_raw", "[lcu-ws-raw] {pretty_json}");
                    }
                    Err(error) => {
                        tracing::warn!(error = %error, "Failed to serialize LCU websocket event for raw logging");
                    }
                }
                ongoing_manager.handle_ws_event(ws_event).await;
            }
        });
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
            let ongoing_app = app;
            let token = cancel_token;
            let ongoing_manager_for_bootstrap = ongoing_manager.clone();

            tokio::spawn(async move {
                ongoing_manager_for_bootstrap.refresh_current().await;

                loop {
                    let event = tokio::select! {
                        _ = token.cancelled() => break,
                        result = ongoing_rx.recv() => {
                            match result {
                                Ok(ev) => ev,
                                Err(tokio::sync::broadcast::error::RecvError::Lagged(n)) => {
                                    tracing::warn!("OngoingGame event bridge lagged, skipped {n}");
                                    ongoing_manager_for_bootstrap.refresh_current().await;
                                    ongoing_manager_for_bootstrap.refresh_match_histories().await;
                                    continue;
                                }
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

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.setup_runtime_bridge(jax.clone());
        self.setup_emit_bridge(jax)?;
        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        depends![TauriHost, LcuShard, OngoingGameShard, SgpShard]
    }
}
