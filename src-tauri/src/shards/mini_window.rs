use std::sync::{Arc, Mutex, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use tauri::{Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::error::AppError;
use crate::shards::tauri_host::TauriHost;
use crate::shards::window_effect::WindowEffectShard;

const MINI_WINDOW_LABEL: &str = "mini";
const MINI_WINDOW_ROUTE: &str = "/mini";
const MINI_WINDOW_TITLE: &str = "League Jax - Mini";
const MINI_WINDOW_WIDTH: f64 = 420.0;
const MINI_WINDOW_HEIGHT: f64 = 680.0;
const MINI_WINDOW_MIN_WIDTH: f64 = 360.0;
const MINI_WINDOW_MIN_HEIGHT: f64 = 520.0;

pub struct MiniWindowShard {
    host: OnceLock<Arc<TauriHost>>,
    window_effect: OnceLock<Arc<WindowEffectShard>>,
    toggle_lock: Mutex<()>,
}

impl MiniWindowShard {
    pub fn new() -> Self {
        Self {
            host: OnceLock::new(),
            window_effect: OnceLock::new(),
            toggle_lock: Mutex::new(()),
        }
    }

    fn try_apply_window_effect(&self, window: &tauri::WebviewWindow) {
        if let Some(window_effect) = self.window_effect.get() {
            if let Err(error) = window_effect.apply_current_to_window(window) {
                tracing::warn!(error = %error, "Failed to apply window effect for mini window");
            }
        } else {
            tracing::warn!("MiniWindowShard window effect shard is not initialized");
        }
    }

    fn ensure_window(&self) -> Result<WebviewWindow, AppError> {
        let host = self
            .host
            .get()
            .ok_or_else(|| AppError::other("mini window shard is not initialized"))?;
        let app = &host.app;

        if let Some(window) = app.get_webview_window(MINI_WINDOW_LABEL) {
            return Ok(window);
        }

        let window = WebviewWindowBuilder::new(
            app,
            MINI_WINDOW_LABEL,
            WebviewUrl::App(MINI_WINDOW_ROUTE.into()),
        )
        .title(MINI_WINDOW_TITLE)
        .inner_size(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT)
        .min_inner_size(MINI_WINDOW_MIN_WIDTH, MINI_WINDOW_MIN_HEIGHT)
        .decorations(false)
        .transparent(true)
        .maximizable(false)
        .resizable(true)
        .visible(false)
        .focused(false)
        .build()
        .map_err(|error| AppError::other(format!("failed to create mini window: {error}")))?;

        self.try_apply_window_effect(&window);

        Ok(window)
    }

    pub fn toggle(&self) -> Result<(), AppError> {
        let _lock = self
            .toggle_lock
            .lock()
            .map_err(|_| AppError::MutexPoisoned)?;
        let window = self.ensure_window()?;
        let is_minimized = window.is_minimized().map_err(|error| {
            AppError::other(format!(
                "failed to check mini window minimized state: {error}"
            ))
        })?;
        let is_visible = window.is_visible().map_err(|error| {
            AppError::other(format!("failed to check mini window visibility: {error}"))
        })?;

        if is_minimized {
            window.unminimize().map_err(|error| {
                AppError::other(format!("failed to unminimize mini window: {error}"))
            })?;
            window
                .show()
                .map_err(|error| AppError::other(format!("failed to show mini window: {error}")))?;
            window.set_focus().map_err(|error| {
                AppError::other(format!("failed to focus mini window: {error}"))
            })?;
            self.try_apply_window_effect(&window);
        } else if is_visible {
            window
                .hide()
                .map_err(|error| AppError::other(format!("failed to hide mini window: {error}")))?;
        } else {
            window
                .show()
                .map_err(|error| AppError::other(format!("failed to show mini window: {error}")))?;
            window.set_focus().map_err(|error| {
                AppError::other(format!("failed to focus mini window: {error}"))
            })?;
            self.try_apply_window_effect(&window);
        }

        Ok(())
    }
}

impl Default for MiniWindowShard {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Shard for MiniWindowShard {
    shard_id!("b5dd6cf2-82b8-4a55-a080-e7e7e7e4b934");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let host = jax.get_shard::<TauriHost>().clone();
        let window_effect = jax.get_shard::<WindowEffectShard>().clone();

        if self.host.set(host).is_err() {
            tracing::warn!("MiniWindowShard app handle was already initialized");
        }
        if self.window_effect.set(window_effect).is_err() {
            tracing::warn!("MiniWindowShard window effect shard was already initialized");
        }

        self.ensure_window()
            .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { Box::new(error) })?;

        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        depends![TauriHost, WindowEffectShard]
    }
}
