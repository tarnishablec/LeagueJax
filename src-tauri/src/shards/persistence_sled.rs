use crate::shards::tauri_host::TauriHost;
use core::error::Error;
use jax::shard::Shard;
use jax::{depends, shard_id, Jax};
use sled::Db;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::OnceCell;
use uuid::Uuid;

pub struct PersistenceSled {
    path: PathBuf,
    db: OnceCell<Db>,
}

impl PersistenceSled {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            path: db_path,
            db: OnceCell::new(),
        }
    }

    pub fn get_db(&self) -> Db {
        self.db
            .get()
            .expect("Sled database not initialized")
            .clone()
    }
}

#[async_trait::async_trait]
impl Shard for PersistenceSled {
    shard_id!("11c8b250-cd30-4f0a-a500-aa4b355311f0");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let sled_db = sled::open(&self.path)?;
        self.db
            .set(sled_db)
            .expect("Sled database already initialized");
        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![TauriHost]
    }
}
