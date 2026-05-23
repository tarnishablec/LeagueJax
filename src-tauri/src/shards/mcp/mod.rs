use std::error::Error;
use std::sync::Arc;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, JaxResult, Shard};
use serde_json::Value;
use tokio::sync::Mutex;
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::shards::settings::{SettingHandle, SettingsShard};
use crate::shards::tauri_host::TauriHost;

mod calls;
mod clients;
mod server;
mod settings;
mod tools;

pub use clients::McpServerStateDto;
pub use tools::registry::McpToolDto;

pub struct McpShard {
    runtime: Arc<Mutex<Option<server::McpServerRuntime>>>,
}

impl McpShard {
    pub fn new() -> Self {
        Self {
            runtime: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn server_state(&self) -> McpServerStateDto {
        server::server_state(&self.runtime).await
    }

    pub fn tools(&self) -> Vec<McpToolDto> {
        server::tool_dtos()
    }

    async fn toggle_server(
        runtime: &Arc<Mutex<Option<server::McpServerRuntime>>>,
        port_handle: &SettingHandle,
        parent_token: CancellationToken,
        app: tauri::AppHandle,
    ) -> Result<Value, AppError> {
        let running = runtime.lock().await.is_some();
        let state = if running {
            let endpoint = server::stop_server(runtime).await;
            let _ = endpoint;
            McpServerStateDto::stopped()
        } else {
            let port_value = port_handle.get_value()?;
            let port = settings::port_from_value(&port_value)?;
            let (endpoint, clients, call_records) =
                server::start_server(runtime, parent_token, port, app.clone()).await?;
            McpServerStateDto::running(
                endpoint,
                clients::clients_snapshot(&clients).await,
                calls::call_records_snapshot(&call_records).await,
            )
        };

        clients::emit_state_changed(&app, &state);
        Ok(serde_json::to_value(state)?)
    }
}

impl Default for McpShard {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Shard for McpShard {
    shard_id!("c7d2b8a8-8a35-4e7d-a802-3df705edb6d3");
    depends![TauriHost, SettingsShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let host = jax.get_shard::<TauriHost>();
        let settings_shard = jax.get_shard::<SettingsShard>();
        let port_handle = settings_shard.register_definition(settings::build_port_definition())?;
        let runtime = self.runtime.clone();
        let parent_token = host.cancellation_token();
        let app = host.app.clone();

        settings_shard.register_action(settings::build_toggle_action_definition(), move || {
            let runtime = runtime.clone();
            let port_handle = port_handle.clone();
            let parent_token = parent_token.clone();
            let app = app.clone();
            async move { Self::toggle_server(&runtime, &port_handle, parent_token, app).await }
        })?;

        Ok(())
    }

    async fn teardown(&self, _jax: Arc<Jax>) -> JaxResult<()> {
        server::stop_server(&self.runtime).await;
        Ok(())
    }
}
