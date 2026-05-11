mod manager;
pub mod types;

use std::error::Error;
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use tauri::Emitter;
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
    claimables_claimable_count, claimables_notification_fingerprint,
    ClaimToolClaimablesAvailableEventDto, CLAIM_TOOL_CLAIM_NOTIFICATION_DEFAULT,
    CLAIM_TOOL_CLAIM_NOTIFICATION_SETTING_ID, CLAIM_TOOL_NOTIFICATION_SCAN_INTERVAL_SECONDS,
};

const CLAIM_TOOL_CLAIMABLES_AVAILABLE_EVENT: &str = "claim-tool-claimables-available";

#[derive(Clone)]
pub(super) struct ClaimToolSettings {
    claim_notification_enabled: SettingHandle,
}

impl ClaimToolSettings {
    pub(super) fn claim_notification_enabled(&self) -> bool {
        self.claim_notification_enabled
            .get_value()
            .ok()
            .and_then(|value| value.as_bool())
            .unwrap_or(CLAIM_TOOL_CLAIM_NOTIFICATION_DEFAULT)
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
        let claim_notification_enabled = settings.register_definition(SettingDefinitionDto {
            id: CLAIM_TOOL_CLAIM_NOTIFICATION_SETTING_ID.to_string(),
            label_key: "tools.claimTool.claimNotification.label".to_string(),
            hint_key: Some("tools.claimTool.claimNotification.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: Some(SettingControlDto::Toggle),
            default_value: Value::Bool(CLAIM_TOOL_CLAIM_NOTIFICATION_DEFAULT),
            order: Some(10),
            visible: Some(false),
            options: None,
        })?;

        Ok(ClaimToolSettings {
            claim_notification_enabled,
        })
    }

    fn setup_runtime(
        &self,
        manager: ClaimToolManager,
        lcu_manager: Arc<LcuManager>,
        tauri_host: Arc<TauriHost>,
    ) {
        let (trigger_tx, trigger_rx) = mpsc::channel(32);

        subscribe_lcu_triggers(lcu_manager, trigger_tx, manager.clone());

        let app = tauri_host.app.clone();
        tauri_host.spawn(async move {
            run_claim_notification_loop(manager, trigger_rx, app).await;
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

fn subscribe_lcu_triggers(
    lcu_manager: Arc<LcuManager>,
    trigger_tx: mpsc::Sender<()>,
    manager: ClaimToolManager,
) {
    let state_trigger_tx = trigger_tx.clone();
    lcu_manager.clone().subscribe_state_fn(move |event| {
        let state_trigger_tx = state_trigger_tx.clone();
        let manager = manager.clone();
        async move {
            if matches!(event, LcuManagerStateEvent::FocusChanged(_)) {
                manager.clear_recent_activity();
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

async fn run_claim_notification_loop(
    manager: ClaimToolManager,
    mut trigger_rx: mpsc::Receiver<()>,
    app: tauri::AppHandle,
) {
    let mut ticker = interval(Duration::from_secs(
        CLAIM_TOOL_NOTIFICATION_SCAN_INTERVAL_SECONDS,
    ));
    ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);
    let mut last_fingerprint: Option<String> = None;

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

        if !manager.snapshot().claim_notification_enabled {
            last_fingerprint = None;
            continue;
        }

        if !manager.has_focused_session().await {
            last_fingerprint = None;
            continue;
        }

        match manager.get_claimables().await {
            Ok(claimables) => {
                let Some(fingerprint) = claimables_notification_fingerprint(&claimables) else {
                    last_fingerprint = None;
                    continue;
                };
                if last_fingerprint.as_deref() == Some(fingerprint.as_str()) {
                    continue;
                }

                let claimable_count =
                    claimables_claimable_count(&claimables).min(u32::MAX as usize) as u32;
                let event = ClaimToolClaimablesAvailableEventDto {
                    snapshot: manager.snapshot(),
                    claimables,
                    claimable_count,
                    fingerprint: fingerprint.clone(),
                };

                if let Err(error) = app.emit(CLAIM_TOOL_CLAIMABLES_AVAILABLE_EVENT, event) {
                    tracing::warn!(
                        channel = "claim-tool",
                        error = %error,
                        "Failed to emit claimables notification event"
                    );
                }
                tracing::info!(
                    channel = "claim-tool",
                    claimable_count,
                    "Claimable items available"
                );
                last_fingerprint = Some(fingerprint);
            }
            Err(error) => {
                if !matches!(error, AppError::LcuNotConnected) {
                    tracing::warn!(
                        channel = "claim-tool",
                        error = %error,
                        "Claim notification scan failed"
                    );
                }
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
