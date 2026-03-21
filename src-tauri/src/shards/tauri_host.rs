use std::future::Future;

use async_trait::async_trait;
use jax::{shard_id, Shard};
use tokio::sync::watch;

pub struct TauriHost {
    pub app: tauri::AppHandle,
    shutdown_tx: watch::Sender<bool>,
    shutdown_rx: watch::Receiver<bool>,
}

impl TauriHost {
    pub fn new(app: tauri::AppHandle) -> Self {
        let (tx, rx) = watch::channel(false);
        Self {
            app,
            shutdown_tx: tx,
            shutdown_rx: rx,
        }
    }

    /// Spawn a background task automatically canceled on app shutdown.
    pub fn spawn<F>(&self, future: F)
    where
        F: Future<Output = ()> + Send + 'static,
    {
        let mut rx = self.shutdown_rx.clone();
        tokio::spawn(async move {
            tokio::select! {
                _ = rx.changed() => {}
                _ = future => {}
            }
        });
    }

    /// Fire the shutdown signal. Called from the Tauri exit handler.
    pub fn initiate_shutdown(&self) {
        self.shutdown_tx.send(true).ok();
    }
}

#[async_trait]
impl Shard for TauriHost {
    shard_id!("d25bdd2c-277b-496b-92ee-c056b9af4e98");
}
