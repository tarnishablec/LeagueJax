use std::future::Future;
use std::sync::OnceLock;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::sync::Arc;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::error::AppError;

use crate::shards::tauri_host::TauriHost;

#[derive(Debug, Serialize, Deserialize)]
struct CacheEntry<T> {
    version: String,
    data: T,
}

pub struct StaticCacheShard {
    app: OnceLock<AppHandle>,
}

impl StaticCacheShard {
    pub fn new() -> Self {
        Self {
            app: OnceLock::new(),
        }
    }

    pub fn get<T: DeserializeOwned>(
        &self,
        store_file: &str,
        key: &str,
        version: &str,
    ) -> Option<T> {
        let app = self.app.get()?;
        let store = app.store(store_file).ok()?;
        let entry: CacheEntry<T> = serde_json::from_value(store.get(key)?).ok()?;
        if entry.version == version {
            Some(entry.data)
        } else {
            None
        }
    }

    pub async fn get_or_init<T, F, Fut>(
        &self,
        store_file: &str,
        key: &str,
        version: &str,
        init: F,
    ) -> Result<T, AppError>
    where
        T: Serialize + DeserializeOwned,
        F: FnOnce() -> Fut,
        Fut: Future<Output = Result<T, AppError>>,
    {
        if let Some(cached) = self.get::<T>(store_file, key, version) {
            return Ok(cached);
        }
        let data = init().await?;
        self.set(store_file, key, version, &data);
        Ok(data)
    }

    pub fn set<T: Serialize>(&self, store_file: &str, key: &str, version: &str, data: &T) {
        let Some(app) = self.app.get() else { return };
        let Ok(store) = app.store(store_file) else {
            return;
        };
        if let Ok(value) = serde_json::to_value(&CacheEntry {
            version: version.to_string(),
            data,
        }) {
            store.set(key, value);
        }
    }
}

#[async_trait]
impl Shard for StaticCacheShard {
    shard_id!("a1c3e5f7-9b0d-4e2f-8a6c-1d3e5f7a9b0d");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let app = jax.get_shard::<TauriHost>().app.clone();
        self.app.set(app).ok();
        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        depends![TauriHost]
    }
}
