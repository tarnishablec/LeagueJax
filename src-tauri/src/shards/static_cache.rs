use std::future::Future;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde::{de::DeserializeOwned, Serialize};
use std::fs;
use std::io::ErrorKind;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

use crate::error::AppError;

use crate::shards::tauri_host::TauriHost;

pub struct StaticCacheShard {
    app: OnceLock<AppHandle>,
}

impl StaticCacheShard {
    pub fn new() -> Self {
        Self {
            app: OnceLock::new(),
        }
    }

    pub async fn get_json_file_or_init<T, F, Fut>(
        &self,
        namespace: &str,
        file_name: &str,
        init: F,
    ) -> Result<T, AppError>
    where
        T: DeserializeOwned + Serialize,
        F: FnOnce() -> Fut,
        Fut: Future<Output = Result<T, AppError>>,
    {
        let cache_file = self.cache_file_path(namespace, file_name);
        if let Ok(path) = &cache_file {
            if let Some(cached) = read_json_cache_file::<T>(path) {
                return Ok(cached);
            }
        }

        let data = init().await?;

        if let Ok(path) = cache_file {
            if let Err(error) = write_json_cache_file(&path, &data) {
                tracing::warn!(
                    path = %path.display(),
                    error = %error,
                    "Failed to write static JSON cache file"
                );
            }
        }

        Ok(data)
    }

    fn cache_file_path(&self, namespace: &str, file_name: &str) -> Result<PathBuf, AppError> {
        let app = self
            .app
            .get()
            .ok_or_else(|| AppError::other("static cache app handle is not initialized"))?;
        Ok(app
            .path()
            .app_data_dir()
            .map_err(|error| AppError::other(format!("failed to resolve app data dir: {error}")))?
            .join("cache")
            .join(sanitize_cache_segment(namespace))
            .join(sanitize_cache_segment(file_name)))
    }
}

fn sanitize_cache_segment(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '-' | '_') {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>();
    if sanitized.is_empty() {
        "unknown".to_string()
    } else {
        sanitized
    }
}

fn read_json_cache_file<T: DeserializeOwned>(path: &Path) -> Option<T> {
    let raw = match fs::read(path) {
        Ok(raw) => raw,
        Err(error) if error.kind() == ErrorKind::NotFound => return None,
        Err(error) => {
            tracing::warn!(
                path = %path.display(),
                error = %error,
                "Failed to read static JSON cache file"
            );
            return None;
        }
    };

    match serde_json::from_slice::<T>(&raw) {
        Ok(data) => Some(data),
        Err(error) => {
            tracing::warn!(
                path = %path.display(),
                error = %error,
                "Static JSON cache file is invalid; refetching"
            );
            None
        }
    }
}

fn write_json_cache_file<T: Serialize>(path: &Path, data: &T) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp_path = path.with_extension(format!(
        "{}.tmp",
        path.extension()
            .and_then(|extension| extension.to_str())
            .unwrap_or("json")
    ));
    fs::write(&tmp_path, serde_json::to_vec(data)?)?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    fs::rename(&tmp_path, path)?;
    Ok(())
}

#[async_trait]
impl Shard for StaticCacheShard {
    shard_id!("a1c3e5f7-9b0d-4e2f-8a6c-1d3e5f7a9b0d");
    depends![TauriHost];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let app = jax.get_shard::<TauriHost>().app.clone();
        self.app.set(app).ok();
        Ok(())
    }
}
