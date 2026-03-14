use async_trait::async_trait;
use jax::shard::Shard;
use jax::Jax;
use std::error::Error;
use std::sync::Arc;
use uuid::{uuid, Uuid};

pub const ID: Uuid = uuid!("d25bdd2c-277b-496b-92ee-c056b9af4e98");

pub struct TauriHost {
    pub app: tauri::AppHandle,
}

impl TauriHost {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }
}

#[async_trait]
impl Shard for TauriHost {
    fn id(&self) -> Uuid {
        ID
    }

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        todo!()
    }
}
