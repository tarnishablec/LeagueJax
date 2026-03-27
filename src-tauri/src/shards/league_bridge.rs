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
        let ongoing_manager = ongoing_shard.initialize(cancel_token.clone());

        let bootstrap_lcu_manager = lcu_manager.clone();
        let bootstrap_ongoing_shard = ongoing_shard.clone();
        let bootstrap_jax = jax.clone();
        let bootstrap_cancel_token = cancel_token.clone();
        tauri_host.spawn(async move {
            let lcu_session = bootstrap_lcu_manager.focused().await;
            let sgp_session = if let Some(lcu) = &lcu_session {
                let sgp_shard = bootstrap_jax.get_shard::<SgpShard>();
                sgp_shard.spg_from_lcu(lcu.clone()).await.ok()
            } else {
                None
            };

            let _ = bootstrap_ongoing_shard
                .initialize_with_focus(bootstrap_cancel_token, lcu_session, sgp_session)
                .await;
        });

        let manager_for_run = lcu_manager.clone();
        tauri_host.spawn(async move {
            manager_for_run.run().await;
        });

        let jax_for_state = jax.clone();
        let manager_for_state = ongoing_manager.clone();
        lcu_manager.clone().subscribe_state_fn(move |event| {
            let jax = jax_for_state.clone();
            let manager = manager_for_state.clone();
            async move {
                match event {
                    LcuManagerStateEvent::FocusChanged(change) => {
                        let (lcu_session, sgp_session) = match change.current {
                            Some(pid) => {
                                let lcu_shard = jax.get_shard::<LcuShard>();
                                let lcu_session =
                                    lcu_shard.manager().and_then(|m| m.session_for_pid(pid));

                                let sgp_session = if let Some(lcu) = &lcu_session {
                                    let sgp_shard = jax.get_shard::<SgpShard>();
                                    sgp_shard.spg_from_lcu(lcu.clone()).await.ok()
                                } else {
                                    None
                                };

                                (lcu_session, sgp_session)
                            }
                            None => (None, None),
                        };

                        manager.handle_focus_changed(lcu_session, sgp_session).await;
                    }
                    LcuManagerStateEvent::InstancesChanged(_) => {}
                }
            }
        });

        #[cfg(debug_assertions)]
        let ws_logger = jax
            .get_shard::<crate::shards::file_logger::FileLoggerShard>()
            .logger()
            .cloned();

        lcu_manager.subscribe_ws_fn(move |ws_event| {
            let ongoing_manager = ongoing_manager.clone();
            #[cfg(debug_assertions)]
            let ws_logger = ws_logger.clone();
            async move {
                #[cfg(debug_assertions)]
                if let Some(logger) = &ws_logger {
                    logger.write("lcu_ws_event_raw", &ws_event);
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
                                    continue;
                                }
                                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                            }
                        }
                    };

                    let _ = ongoing_app.emit("ongoing-game-updated", &event);
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
        depends![
            TauriHost,
            LcuShard,
            OngoingGameShard,
            SgpShard,
            crate::shards::file_logger::FileLoggerShard
        ]
    }
}
