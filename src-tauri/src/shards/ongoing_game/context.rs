use std::sync::Arc;

use tokio::sync::{broadcast, Mutex};

use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::LcuShard;
use crate::shards::ongoing_game::state::OngoingState;
use crate::shards::ongoing_game::types::OngoingGameEvent;
use crate::shards::sgp::SgpShard;

use super::manager::OngoingGameSettings;

pub(crate) const MAX_MATCH_HISTORY_FETCH_CONCURRENCY: usize = 3;

pub(crate) struct Channels {
    pub(crate) ongoing_tx: broadcast::Sender<OngoingGameEvent>,
}

impl Channels {
    fn new() -> Self {
        let (ongoing_tx, _) = broadcast::channel(64);
        Self { ongoing_tx }
    }

    pub(crate) fn broadcast(&self, event: OngoingGameEvent) {
        let _ = self.ongoing_tx.send(event);
    }

    pub(crate) fn subscribe(&self) -> broadcast::Receiver<OngoingGameEvent> {
        self.ongoing_tx.subscribe()
    }
}

pub struct OngoingGameContext {
    pub(crate) settings: OngoingGameSettings,
    pub(crate) sgp_shard: Arc<SgpShard>,
    pub(crate) lcu_shard: Arc<LcuShard>,
    pub(crate) state: Mutex<OngoingState>,
    pub(crate) channels: Channels,
}

impl OngoingGameContext {
    pub(crate) fn new(
        settings: OngoingGameSettings,
        sgp_shard: Arc<SgpShard>,
        lcu_shard: Arc<LcuShard>,
    ) -> Self {
        Self {
            settings,
            sgp_shard,
            lcu_shard,
            state: Mutex::new(OngoingState::new()),
            channels: Channels::new(),
        }
    }

    pub(crate) fn broadcast(&self, event: OngoingGameEvent) {
        self.channels.broadcast(event);
    }

    /// Resolve the currently focused LCU session via the LcuShard.  Must NOT
    /// be called while holding the manager state lock — `lcu::LcuManager::focused`
    /// awaits its own internal lock and would otherwise risk deadlock.
    pub(crate) async fn focused_session(&self) -> Option<Arc<LcuSession>> {
        self.lcu_shard.manager()?.focused().await
    }

    pub(crate) async fn focused_pid(&self) -> Option<u32> {
        self.lcu_shard.manager()?.focused_pid().await
    }
}
