use async_trait::async_trait;
use jax::{shard_id, Shard};

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
}
