use core::error::Error;
use jax::{depends, shard_id, Jax, Shard};
use sled::Db;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::OnceLock;
use uuid::Uuid;

pub struct PersistenceSled {
    path: PathBuf,
    db: OnceLock<Db>,
}

impl PersistenceSled {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            path: db_path,
            db: OnceLock::new(),
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
        let path = self.path.clone();
        let db = tokio::task::spawn_blocking(move || sled::open(path)).await??;

        self.db
            .set(db)
            .map_err(|_| "Database already initialized")?;
        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![]
    }
}
