pub mod driver;

use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::shards::lcu::manager::{LcuEventReceiver, LcuManagerEvent};
use crate::shards::lcu::watcher::LcuWsEvent;
use crate::shards::lcu::LcuShard;
use crate::shards::sgp::SgpShard;
use crate::shards::tauri_host::TauriHost;

use self::driver::OngoingGameDriver;

pub struct OngoingGameShard {
    state: Mutex<ShardState>,
}

struct ShardState {
    driver: Option<OngoingGameDriver>,
    /// Broadcast sender to forward WsEvents to the current driver.
    ws_tx: Option<tokio::sync::broadcast::Sender<LcuWsEvent>>,
}

impl OngoingGameShard {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(ShardState {
                driver: None,
                ws_tx: None,
            }),
        }
    }
}

#[async_trait]
impl Shard for OngoingGameShard {
    shard_id!("38121643-b79d-4382-9592-c647da511c1b");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let lcu_shard = jax.get_shard::<LcuShard>();
        let manager = lcu_shard.manager().ok_or_else(|| {
            Box::<dyn Error + Send + Sync>::from("LcuManager not available")
        })?;

        let receiver = Arc::new(OngoingGameEventReceiver {
            jax: jax.clone(),
        });
        manager.subscribe_receiver(receiver);

        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![LcuShard, SgpShard, TauriHost]
    }
}

// ---------------------------------------------------------------------------
// LcuEventReceiver — bridges LcuManager events to Driver lifecycle
// ---------------------------------------------------------------------------

struct OngoingGameEventReceiver {
    jax: Arc<Jax>,
}

#[async_trait]
impl LcuEventReceiver for OngoingGameEventReceiver {
    async fn on_event(&self, event: LcuManagerEvent) {
        match event {
            LcuManagerEvent::FocusChanged(change) => {
                self.handle_focus_changed(change.current).await;
            }
            LcuManagerEvent::WsEvent(ws_event) => {
                self.forward_ws_event(ws_event).await;
            }
            LcuManagerEvent::InstancesChanged(_) => {
                // Not needed for the ongoing game
            }
        }
    }
}

impl OngoingGameEventReceiver {
    async fn handle_focus_changed(&self, current_pid: Option<u32>) {
        let shard = self.jax.get_shard::<OngoingGameShard>();
        let mut state = shard.state.lock().await;

        // Drop old driver (cancels its token via Drop)
        state.driver = None;
        state.ws_tx = None;

        let Some(pid) = current_pid else {
            tracing::debug!("OngoingGame: no focused client, driver cleared");
            return;
        };

        // Get dependencies for the new driver
        let lcu_shard = self.jax.get_shard::<LcuShard>();
        let Some(session) = lcu_shard.manager().and_then(|m| m.session_for_pid(pid)) else {
            return;
        };

        let tauri_host = self.jax.get_shard::<TauriHost>();
        let app = tauri_host.app.clone();
        let cancel_token = tauri_host.cancellation_token();

        // Create a broadcast channel for forwarding WsEvents to a driver
        let (ws_tx, ws_rx) = tokio::sync::broadcast::channel(64);

        let driver = OngoingGameDriver::new(session, app, ws_rx, cancel_token);

        state.driver = Some(driver);
        state.ws_tx = Some(ws_tx);

        tracing::info!("OngoingGame: driver created for pid {pid}");
    }

    async fn forward_ws_event(&self, event: LcuWsEvent) {
        let shard = self.jax.get_shard::<OngoingGameShard>();
        let state = shard.state.lock().await;
        if let Some(tx) = &state.ws_tx {
            let _ = tx.send(event);
        }
    }
}
