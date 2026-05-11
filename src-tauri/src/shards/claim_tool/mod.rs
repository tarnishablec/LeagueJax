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
const CLAIM_TOOL_NOTIFICATION_COLLECTION_SAMPLE_MS: u64 = 500;
const CLAIM_TOOL_NOTIFICATION_COLLECTION_MAX_SAMPLES: u8 = 5;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ClaimNotificationTrigger {
    FocusChanged,
    ClaimRelatedWs,
    Periodic,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ClaimNotificationCollectionDecision {
    Continue,
    Ready,
}

struct ClaimNotificationCollector {
    previous_fingerprint: Option<String>,
    sample_count: u8,
    saw_focus_changed: bool,
}

struct ClaimNotificationCollectionOutcome {
    claimables: self::types::ClaimToolClaimablesDto,
    saw_focus_changed: bool,
}

impl ClaimNotificationCollector {
    fn new() -> Self {
        Self {
            previous_fingerprint: None,
            sample_count: 0,
            saw_focus_changed: false,
        }
    }

    fn apply_trigger(&mut self, trigger: ClaimNotificationTrigger) {
        if matches!(trigger, ClaimNotificationTrigger::FocusChanged) {
            self.previous_fingerprint = None;
            self.sample_count = 0;
            self.saw_focus_changed = true;
        }
    }

    fn saw_focus_changed(&self) -> bool {
        self.saw_focus_changed
    }

    fn observe(
        &mut self,
        fingerprint: Option<String>,
    ) -> ClaimNotificationCollectionDecision {
        self.sample_count = self.sample_count.saturating_add(1);

        let Some(fingerprint) = fingerprint else {
            self.previous_fingerprint = None;
            return ClaimNotificationCollectionDecision::Ready;
        };

        let stable = self.previous_fingerprint.as_deref() == Some(fingerprint.as_str());
        self.previous_fingerprint = Some(fingerprint);
        if stable || self.sample_count >= CLAIM_TOOL_NOTIFICATION_COLLECTION_MAX_SAMPLES {
            ClaimNotificationCollectionDecision::Ready
        } else {
            ClaimNotificationCollectionDecision::Continue
        }
    }
}

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
    trigger_tx: mpsc::Sender<ClaimNotificationTrigger>,
    manager: ClaimToolManager,
) {
    let state_trigger_tx = trigger_tx.clone();
    lcu_manager.clone().subscribe_state_fn(move |event| {
        let state_trigger_tx = state_trigger_tx.clone();
        let manager = manager.clone();
        async move {
            if matches!(event, LcuManagerStateEvent::FocusChanged(_)) {
                manager.clear_recent_activity();
                let _ = state_trigger_tx
                    .send(ClaimNotificationTrigger::FocusChanged)
                    .await;
            }
        }
    });

    lcu_manager.subscribe_ws_fn(move |event| {
        let trigger_tx = trigger_tx.clone();
        async move {
            if is_claim_related_ws_event(&event) {
                let _ = trigger_tx
                    .send(ClaimNotificationTrigger::ClaimRelatedWs)
                    .await;
            }
        }
    });
}

async fn run_claim_notification_loop(
    manager: ClaimToolManager,
    mut trigger_rx: mpsc::Receiver<ClaimNotificationTrigger>,
    app: tauri::AppHandle,
) {
    let mut ticker = interval(Duration::from_secs(
        CLAIM_TOOL_NOTIFICATION_SCAN_INTERVAL_SECONDS,
    ));
    ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);
    let mut last_fingerprint: Option<String> = None;

    loop {
        let initial_trigger = tokio::select! {
            _ = ticker.tick() => {
                ClaimNotificationTrigger::Periodic
            }
            received = trigger_rx.recv() => {
                let Some(trigger) = received else {
                    break;
                };
                trigger
            }
        };

        if !manager.snapshot().claim_notification_enabled {
            last_fingerprint = None;
            continue;
        }

        if !manager.has_focused_session().await {
            last_fingerprint = None;
            continue;
        }

        match collect_stable_claimables(&manager, &mut trigger_rx, initial_trigger).await {
            None => break,
            Some(Ok(outcome)) => {
                if outcome.saw_focus_changed {
                    last_fingerprint = None;
                }
                let claimables = outcome.claimables;
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
            Some(Err(error)) => {
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

async fn collect_stable_claimables(
    manager: &ClaimToolManager,
    trigger_rx: &mut mpsc::Receiver<ClaimNotificationTrigger>,
    initial_trigger: ClaimNotificationTrigger,
) -> Option<Result<ClaimNotificationCollectionOutcome, AppError>> {
    let mut collector = ClaimNotificationCollector::new();
    collector.apply_trigger(initial_trigger);

    loop {
        let claimables = match manager.get_claimables().await {
            Ok(claimables) => claimables,
            Err(error) => return Some(Err(error)),
        };
        let fingerprint = claimables_notification_fingerprint(&claimables);
        if collector.observe(fingerprint) == ClaimNotificationCollectionDecision::Ready {
            return Some(Ok(ClaimNotificationCollectionOutcome {
                claimables,
                saw_focus_changed: collector.saw_focus_changed(),
            }));
        }

        if !wait_for_next_collection_sample(&mut collector, trigger_rx).await {
            return None;
        }
    }
}

async fn wait_for_next_collection_sample(
    collector: &mut ClaimNotificationCollector,
    trigger_rx: &mut mpsc::Receiver<ClaimNotificationTrigger>,
) -> bool {
    loop {
        tokio::select! {
            _ = tokio::time::sleep(Duration::from_millis(CLAIM_TOOL_NOTIFICATION_COLLECTION_SAMPLE_MS)) => {
                return true;
            }
            received = trigger_rx.recv() => {
                let Some(trigger) = received else {
                    return false;
                };
                collector.apply_trigger(trigger);
                while let Ok(trigger) = trigger_rx.try_recv() {
                    collector.apply_trigger(trigger);
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn notification_collector_waits_until_fingerprint_is_stable() {
        let mut collector = ClaimNotificationCollector::new();

        assert_eq!(
            collector.observe(Some("reward:1".to_string())),
            ClaimNotificationCollectionDecision::Continue
        );
        assert_eq!(
            collector.observe(Some("reward:1|mission:1|mission:2|mission:3".to_string())),
            ClaimNotificationCollectionDecision::Continue
        );
        assert_eq!(
            collector.observe(Some("reward:1|mission:1|mission:2|mission:3".to_string())),
            ClaimNotificationCollectionDecision::Ready
        );
    }

    #[test]
    fn notification_collector_emits_last_fingerprint_at_sample_limit() {
        let mut collector = ClaimNotificationCollector::new();

        for fingerprint in ["a", "b", "c", "d"] {
            assert_eq!(
                collector.observe(Some(fingerprint.to_string())),
                ClaimNotificationCollectionDecision::Continue
            );
        }
        assert_eq!(
            collector.observe(Some("e".to_string())),
            ClaimNotificationCollectionDecision::Ready
        );
    }

    #[test]
    fn notification_collector_focus_trigger_resets_candidate() {
        let mut collector = ClaimNotificationCollector::new();

        assert_eq!(
            collector.observe(Some("reward:1".to_string())),
            ClaimNotificationCollectionDecision::Continue
        );
        collector.apply_trigger(ClaimNotificationTrigger::FocusChanged);
        assert!(collector.saw_focus_changed());

        assert_eq!(
            collector.observe(Some("reward:1".to_string())),
            ClaimNotificationCollectionDecision::Continue
        );
    }
}
