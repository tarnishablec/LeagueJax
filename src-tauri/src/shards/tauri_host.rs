use std::future::Future;
use std::path::PathBuf;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};
use serde::Serialize;
use tokio_util::sync::CancellationToken;
use ts_rs::TS;

pub struct TauriHost {
    pub app: tauri::AppHandle,
    cancel_token: CancellationToken,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "tauri_host.ts")]
#[serde(rename_all = "camelCase")]
pub struct RevealPathResult {
    pub ok: bool,
    pub path: String,
    pub reason: Option<String>,
}

impl RevealPathResult {
    pub fn ok(path: PathBuf) -> Self {
        Self {
            ok: true,
            path: path.to_string_lossy().to_string(),
            reason: None,
        }
    }

    pub fn failed(path: impl Into<String>, reason: impl Into<String>) -> Self {
        Self {
            ok: false,
            path: path.into(),
            reason: Some(reason.into()),
        }
    }
}

impl TauriHost {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self {
            app,
            cancel_token: CancellationToken::new(),
        }
    }

    /// Returns a child token that other modules can use to spawn cancellable tasks.
    pub fn cancellation_token(&self) -> CancellationToken {
        self.cancel_token.child_token()
    }

    /// Spawn a background task automatically canceled on app shutdown.
    pub fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + Send + 'static,
    {
        let token = self.cancel_token.child_token();
        tokio::spawn(async move {
            tokio::select! {
                _ = token.cancelled() => {}
                _ = future => {}
            }
        });
    }

    /// Fire the shutdown signal. Called from the Tauri exit handler.
    pub fn initiate_shutdown(&self) {
        self.cancel_token.cancel();
    }

    pub fn reveal_path(&self, path: String) -> RevealPathResult {
        let result = resolve_reveal_path(&path);
        if !result.ok {
            return result;
        }

        if let Err(error) = tauri_plugin_opener::reveal_item_in_dir(&result.path) {
            return RevealPathResult::failed(
                result.path,
                format!("Failed to reveal path: {error}"),
            );
        }

        result
    }

    fn spawn_signal_handler(&self) {
        let token = self.cancel_token.clone();
        tokio::spawn(async move {
            #[cfg(unix)]
            {
                use tokio::signal::unix::{signal, SignalKind};
                let mut sigterm = signal(SignalKind::terminate())
                    .unwrap_or_else(|e| panic!("Failed to register SIGTERM handler: {e}"));
                tokio::select! {
                    _ = tokio::signal::ctrl_c() => {}
                    _ = sigterm.recv() => {}
                }
            }
            #[cfg(not(unix))]
            {
                tokio::signal::ctrl_c().await.ok();
            }
            tracing::info!("Received shutdown signal, exiting");
            token.cancel();
            std::process::exit(0);
        });
    }
}

fn resolve_reveal_path(path: &str) -> RevealPathResult {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return RevealPathResult::failed(trimmed, "Path cannot be empty");
    }

    let path = PathBuf::from(trimmed);
    if !path.exists() {
        return RevealPathResult::failed(path.to_string_lossy(), "Path does not exist");
    }

    RevealPathResult::ok(path)
}

impl Drop for TauriHost {
    fn drop(&mut self) {
        self.cancel_token.cancel();
    }
}

#[async_trait]
impl Shard for TauriHost {
    shard_id!("d25bdd2c-277b-496b-92ee-c056b9af4e98");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn core::error::Error + Send + Sync>> {
        self.spawn_signal_handler();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reveal_path_result_reports_empty_path() {
        let result = resolve_reveal_path("   ");

        assert!(!result.ok);
        assert_eq!(result.reason.as_deref(), Some("Path cannot be empty"));
    }

    #[test]
    fn reveal_path_result_reports_missing_path() {
        let missing_path = std::env::temp_dir().join("league-jax-missing-reveal-path");

        let result = resolve_reveal_path(&missing_path.to_string_lossy());

        assert!(!result.ok);
        assert_eq!(result.reason.as_deref(), Some("Path does not exist"));
    }

    #[test]
    fn reveal_path_result_accepts_existing_file() -> Result<(), std::io::Error> {
        let root = std::env::temp_dir().join("league-jax-reveal-path-test");
        std::fs::create_dir_all(&root)?;
        let path = root.join("target.txt");
        std::fs::write(&path, [])?;

        let result = resolve_reveal_path(&path.to_string_lossy());

        assert!(result.ok);
        assert_eq!(result.reason, None);
        assert_eq!(std::path::PathBuf::from(result.path), path);
        Ok(())
    }
}
