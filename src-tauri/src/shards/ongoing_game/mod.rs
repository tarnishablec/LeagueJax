pub mod driver;
pub mod manager;

use std::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

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

    pub fn initialize(&self, cancel_token: CancellationToken) -> Arc<OngoingGameManager> {
        if let Some(manager) = self.manager() {
            return manager;
        }

        let manager = Arc::new(OngoingGameManager::new(cancel_token));
        if self.manager.set(manager.clone()).is_err() {
            if let Some(existing) = self.manager() {
                return existing;
            }
        }
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
