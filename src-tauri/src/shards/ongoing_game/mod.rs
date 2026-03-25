pub mod driver;
pub mod manager;

use std::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use uuid::Uuid;

use crate::shards::lcu::manager::{LcuEventReceiver, LcuManagerEvent};
use crate::shards::lcu::LcuShard;
use crate::shards::sgp::SgpShard;
use crate::shards::tauri_host::TauriHost;

use self::manager::OngoingGameManager;

pub struct OngoingGameShard {
    manager: OnceLock<Arc<OngoingGameManager>>,
}

impl OngoingGameShard {
    pub fn new() -> Self {
        Self {
            manager: OnceLock::new(),
        }
    }

    pub fn manager(&self) -> Option<Arc<OngoingGameManager>> {
        self.manager.get().cloned()
    }
}

#[async_trait]
impl Shard for OngoingGameShard {
    shard_id!("38121643-b79d-4382-9592-c647da511c1b");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let tauri_host = jax.get_shard::<TauriHost>();
        let cancel_token = tauri_host.cancellation_token();

        let lcu_shard = jax.get_shard::<LcuShard>();
        let lcu_manager = lcu_shard.manager().ok_or_else(|| {
            Box::<dyn Error + Send + Sync>::from("LcuManager not available")
        })?;

        let manager = Arc::new(OngoingGameManager::new(cancel_token));
        self.manager.set(manager).ok();

        lcu_manager.subscribe_receiver(Arc::new(OngoingGameEventReceiver { jax: jax.clone() }));

        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![LcuShard, SgpShard, TauriHost]
    }
}

// ---------------------------------------------------------------------------
// LcuEventReceiver — routes LcuManager events to OngoingGameManager
// ---------------------------------------------------------------------------

struct OngoingGameEventReceiver {
    jax: Arc<Jax>,
}

#[async_trait]
impl LcuEventReceiver for OngoingGameEventReceiver {
    async fn on_event(&self, event: LcuManagerEvent) {
        let shard = self.jax.get_shard::<OngoingGameShard>();
        let Some(manager) = shard.manager() else {
            return;
        };

        match event {
            LcuManagerEvent::FocusChanged(change) => {
                // Spawn to avoid blocking the recv loop with network I/O
                let jax = self.jax.clone();
                tokio::spawn(async move {
                    let (lcu_session, sgp_session) = match change.current {
                        Some(pid) => {
                            let lcu_shard = jax.get_shard::<LcuShard>();
                            let lcu_session = lcu_shard
                                .manager()
                                .and_then(|m| m.session_for_pid(pid));

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
                });
            }
            LcuManagerEvent::WsEvent(ws_event) => {
                manager.handle_ws_event(ws_event).await;
            }
            LcuManagerEvent::InstancesChanged(_) => {}
        }
    }
}
