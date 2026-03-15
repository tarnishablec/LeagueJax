use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};
use std::error::Error;
use std::sync::Arc;

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
    shard_id!("d25bdd2c-277b-496b-92ee-c056b9af4e98");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        todo!()
    }
}
