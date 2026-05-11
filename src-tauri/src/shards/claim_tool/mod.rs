mod manager;
pub mod types;

use std::error::Error;
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use tokio::sync::mpsc;
use tokio::time::{interval, MissedTickBehavior};

use crate::error::AppError;
use crate::shards::lcu::concepts::LcuWsEvent;
use crate::shards::lcu::manager::{LcuManager, LcuManagerStateEvent};
use crate::shards::lcu::LcuShard;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::{SettingHandle, SettingsShard};
use crate::shards::tauri_host::TauriHost;

pub use self::manager::ClaimToolManager;
use self::types::{
    CLAIM_TOOL_AUTO_CLAIM_DEFAULT, CLAIM_TOOL_AUTO_CLAIM_SETTING_ID,
    CLAIM_TOOL_AUTO_SCAN_INTERVAL_SECONDS,
};

#[derive(Clone)]
pub(super) struct ClaimToolSettings {
    auto_claim_enabled: SettingHandle,
}

impl ClaimToolSettings {
    pub(super) fn auto_claim_enabled(&self) -> bool {
        self.auto_claim_enabled
            .get_value()
            .ok()
            .and_then(|value| value.as_bool())
            .unwrap_or(CLAIM_TOOL_AUTO_CLAIM_DEFAULT)
    }
}

pub struct ClaimToolShard {
    manager: OnceLock<ClaimToolManager>,
}

impl ClaimToolShard {
    pub fn new() -> Self {
        Self {
            manager: OnceLock::new(),
        }
    }

    pub fn manager(&self) -> Option<ClaimToolManager> {
        self.manager.get().cloned()
    }

    fn register_settings(
        &self,
        settings: &Arc<SettingsShard>,
    ) -> Result<ClaimToolSettings, AppError> {
        let auto_claim_enabled = settings.register_definition(SettingDefinitionDto {
            id: CLAIM_TOOL_AUTO_CLAIM_SETTING_ID.to_string(),
            label_key: "tools.claimTool.autoClaim.label".to_string(),
            hint_key: Some("tools.claimTool.autoClaim.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: Some(SettingControlDto::Toggle),
            default_value: Value::Bool(CLAIM_TOOL_AUTO_CLAIM_DEFAULT),
            order: Some(10),
            visible: Some(false),
            options: None,
        })?;

        Ok(ClaimToolSettings { auto_claim_enabled })
    }

    fn setup_runtime(
        &self,
        manager: ClaimToolManager,
        lcu_manager: Arc<LcuManager>,
        tauri_host: Arc<TauriHost>,
    ) {
        let (trigger_tx, trigger_rx) = mpsc::channel(32);

        subscribe_lcu_triggers(lcu_manager, trigger_tx);

        tauri_host.spawn(async move {
            run_auto_claim_loop(manager, trigger_rx).await;
        });
    }
}

#[async_trait]
impl Shard for ClaimToolShard {
    shard_id!("6df55ec3-2b54-4c72-9e6a-f403f23a22dd");
    depends![SettingsShard, LcuShard, TauriHost];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings_shard = jax.get_shard::<SettingsShard>();
        let lcu_shard = jax.get_shard::<LcuShard>();
        let tauri_host = jax.get_shard::<TauriHost>();

        let settings = self.register_settings(&settings_shard)?;
        let lcu_manager = lcu_shard.initialize(tauri_host.cancellation_token())?;
        let manager = ClaimToolManager::new(lcu_shard, settings);

        if self.manager.set(manager.clone()).is_err() {
            tracing::warn!("ClaimToolShard manager already initialized");
        }

        self.setup_runtime(manager, lcu_manager, tauri_host);

        Ok(())
    }
}

fn subscribe_lcu_triggers(lcu_manager: Arc<LcuManager>, trigger_tx: mpsc::Sender<()>) {
    let state_trigger_tx = trigger_tx.clone();
    lcu_manager.clone().subscribe_state_fn(move |event| {
        let state_trigger_tx = state_trigger_tx.clone();
        async move {
            if matches!(event, LcuManagerStateEvent::FocusChanged(_)) {
                let _ = state_trigger_tx.send(()).await;
            }
        }
    });

    lcu_manager.subscribe_ws_fn(move |event| {
        let trigger_tx = trigger_tx.clone();
        async move {
            if is_claim_related_ws_event(&event) {
                let _ = trigger_tx.send(()).await;
            }
        }
    });
}

async fn run_auto_claim_loop(manager: ClaimToolManager, mut trigger_rx: mpsc::Receiver<()>) {
    let mut ticker = interval(Duration::from_secs(CLAIM_TOOL_AUTO_SCAN_INTERVAL_SECONDS));
    ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            _ = ticker.tick() => {}
            received = trigger_rx.recv() => {
                if received.is_none() {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(600)).await;
                while trigger_rx.try_recv().is_ok() {}
            }
        }

        if !manager.snapshot().auto_claim_enabled {
            continue;
        }

        if !manager.has_focused_session().await {
            continue;
        }

        if let Err(error) = manager.claim_all().await {
            if !matches!(error, AppError::LcuNotConnected) {
                tracing::warn!(
                    channel = "claim-tool",
                    error = %error,
                    "Automatic claim run failed"
                );
            }
        }
    }
}

fn is_claim_related_ws_event(event: &LcuWsEvent) -> bool {
    let Some(uri) = ws_event_uri(event) else {
        return false;
    };

    uri.starts_with("/lol-rewards/v1/grants")
        || uri.starts_with("/lol-missions/v1/missions")
        || uri.starts_with("/lol-event-hub/v1/events")
}

fn ws_event_uri(event: &LcuWsEvent) -> Option<&str> {
    match event {
        LcuWsEvent::Other(value) => value.get("uri").and_then(|value| value.as_str()),
        _ => None,
    }
}
