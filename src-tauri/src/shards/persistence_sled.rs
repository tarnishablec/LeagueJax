use crate::shards::tauri_host::TauriHost;
use core::any::TypeId;
use core::error::Error;
use jax::shard::Shard;
use jax::{depends, Jax};
use sled::Db;
use std::sync::Arc;
use tokio::sync::OnceCell;
use uuid::{uuid, Uuid};

pub const ID: Uuid = uuid!("11c8b250-cd30-4f0a-a500-aa4b355311f0");

pub struct PersistenceSled {
    path: String,
    db: OnceCell<Db>,
}

impl PersistenceSled {
    pub fn new(db_path: String) -> Self {
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
    fn id(&self) -> Uuid {
        ID
    }

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        todo!()
    }

    fn dependencies(&self) -> Vec<TypeId> {
        depends![TauriHost]
    }
}
