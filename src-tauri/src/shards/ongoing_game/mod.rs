pub mod driver;
pub mod manager;
pub mod types;

use std::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

use self::manager::OngoingGameManager;
use crate::shards::lcu::session::LcuSession;
use crate::shards::sgp::session::SgpSession;

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

    pub fn initialize(&self, cancel_token: CancellationToken) -> Arc<OngoingGameManager> {
        self.manager
            .get_or_init(|| Arc::new(OngoingGameManager::new(cancel_token)))
            .clone()
    }

    /// Initialize manager and immediately apply current focused sessions.
    /// An ongoing phase still flows through the state machine, while the startup state is seeded by HTTP.
    pub async fn initialize_with_focus(
        &self,
        cancel_token: CancellationToken,
        lcu_session: Option<Arc<LcuSession>>,
        sgp_session: Option<Arc<SgpSession>>,
    ) -> Arc<OngoingGameManager> {
        let manager = self.initialize(cancel_token);
        manager.handle_focus_changed(lcu_session, sgp_session).await;
        manager
    }
}

#[async_trait]
impl Shard for OngoingGameShard {
    shard_id!("38121643-b79d-4382-9592-c647da511c1b");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![]
    }
}
