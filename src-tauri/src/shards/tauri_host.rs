use std::future::Future;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{shard_id, Jax, Shard};
use tokio_util::sync::CancellationToken;

pub struct TauriHost {
    pub app: tauri::AppHandle,
    cancel_token: CancellationToken,
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
