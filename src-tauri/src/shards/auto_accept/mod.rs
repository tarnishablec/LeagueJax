mod manager;
pub mod types;

use std::error::Error;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, OnceLock,
};
use std::time::Duration;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::shards::lcu::concepts::matchmaking_ready_check::{
    MatchmakingReadyCheckData, ReadyCheckPlayerResponse, ReadyCheckState,
};
use crate::shards::lcu::LcuShard;
use crate::shards::ongoing_game::manager::OngoingGameManager;
use crate::shards::ongoing_game::types::OngoingGameEvent;
use crate::shards::ongoing_game::OngoingGameShard;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::{SettingHandle, SettingsShard};
use crate::shards::tauri_host::TauriHost;

pub use self::manager::AutoAcceptManager;
use self::types::{
    ACCEPT_DELAY_DEFAULT_SECONDS, ACCEPT_DELAY_MAX_SECONDS, ACCEPT_DELAY_MIN_SECONDS,
    ACCEPT_DELAY_SECONDS_SETTING_ID, AUTO_ACCEPT_DEFAULT, AUTO_ACCEPT_SETTING_ID,
};

#[derive(Clone)]
struct AutoAcceptSettings {
    enabled: SettingHandle,
    accept_delay_seconds: SettingHandle,
}

impl AutoAcceptSettings {
    fn enabled(&self) -> bool {
        self.enabled
            .get_value()
            .ok()
            .and_then(|value| value.as_bool())
            .unwrap_or(AUTO_ACCEPT_DEFAULT)
    }

    fn delay(&self) -> Duration {
        let seconds = self
            .accept_delay_seconds
            .get_value()
            .ok()
            .and_then(|value| value.as_f64())
            .filter(|seconds| seconds.is_finite())
            .unwrap_or(ACCEPT_DELAY_DEFAULT_SECONDS)
            .clamp(ACCEPT_DELAY_MIN_SECONDS, ACCEPT_DELAY_MAX_SECONDS);

        Duration::from_secs_f64(seconds)
    }
}

pub struct AutoAcceptShard {
    manager: OnceLock<AutoAcceptManager>,
}

impl AutoAcceptShard {
    pub fn new() -> Self {
        Self {
            manager: OnceLock::new(),
        }
    }

    pub fn manager(&self) -> Option<AutoAcceptManager> {
        self.manager.get().cloned()
    }

    fn register_settings(
        &self,
        settings: &Arc<SettingsShard>,
    ) -> Result<AutoAcceptSettings, crate::error::AppError> {
        let enabled = settings.register_definition(SettingDefinitionDto {
            id: AUTO_ACCEPT_SETTING_ID.to_string(),
            label_key: "settings.matchmaking.autoAccept.label".to_string(),
            hint_key: Some("settings.matchmaking.autoAccept.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Toggle,
            default_value: Value::Bool(AUTO_ACCEPT_DEFAULT),
            order: Some(10),
            visible: Some(true),
            options: None,
        })?;

        let accept_delay_seconds = settings.register_definition(SettingDefinitionDto {
            id: ACCEPT_DELAY_SECONDS_SETTING_ID.to_string(),
            label_key: "settings.matchmaking.acceptDelaySeconds.label".to_string(),
            hint_key: Some("settings.matchmaking.acceptDelaySeconds.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Number {
                placeholder_key: None,
                min: Some(ACCEPT_DELAY_MIN_SECONDS),
                max: Some(ACCEPT_DELAY_MAX_SECONDS),
                step: Some(1.0),
            },
            default_value: Value::from(ACCEPT_DELAY_DEFAULT_SECONDS),
            order: Some(20),
            visible: Some(true),
            options: None,
        })?;

        Ok(AutoAcceptSettings {
            enabled,
            accept_delay_seconds,
        })
    }

    fn setup_runtime(
        &self,
        settings: AutoAcceptSettings,
        manager: AutoAcceptManager,
        ongoing_manager: OngoingGameManager,
        tauri_host: Arc<TauriHost>,
    ) {
        let scheduled = Arc::new(AtomicBool::new(false));

        tauri_host.spawn(async move {
            let mut rx = ongoing_manager.subscribe();

            loop {
                let event = match rx.recv().await {
                    Ok(event) => event,
                    Err(broadcast::error::RecvError::Lagged(skipped)) => {
                        tracing::warn!(
                            skipped,
                            "[auto_accept] ongoing-game broadcast lagged, skipped events"
                        );
                        continue;
                    }
                    Err(broadcast::error::RecvError::Closed) => break,
                };

                let OngoingGameEvent::Updated(updated) = event else {
                    continue;
                };

                let Some(ready_check) = updated.ready_check.as_ref() else {
                    scheduled.store(false, Ordering::Release);
                    continue;
                };

                if !Self::should_accept_ready_check(ready_check) {
                    scheduled.store(false, Ordering::Release);
                    continue;
                }

                if !settings.enabled() {
                    continue;
                }

                if scheduled.swap(true, Ordering::AcqRel) {
                    continue;
                }

                let delay = settings.delay();
                let manager = manager.clone();
                let settings = settings.clone();
                let ongoing_manager = ongoing_manager.clone();
                let scheduled = scheduled.clone();

                tokio::spawn(async move {
                    tokio::time::sleep(delay).await;

                    if !settings.enabled() {
                        scheduled.store(false, Ordering::Release);
                        return;
                    }

                    let snapshot = ongoing_manager.snapshot();
                    let is_still_accepting = snapshot
                        .ready_check
                        .as_ref()
                        .is_some_and(Self::should_accept_ready_check);

                    if !is_still_accepting {
                        scheduled.store(false, Ordering::Release);
                        return;
                    }

                    if let Err(error) = manager.accept_ready_check_for_focused().await {
                        scheduled.store(false, Ordering::Release);
                        tracing::warn!(error = %error, "[auto_accept] failed to accept ready check");
                    }
                });
            }
        });
    }

    fn should_accept_ready_check(ready_check: &MatchmakingReadyCheckData) -> bool {
        matches!(ready_check.state, ReadyCheckState::InProgress)
            && matches!(ready_check.player_response, ReadyCheckPlayerResponse::None)
    }
}

#[async_trait]
impl Shard for AutoAcceptShard {
    shard_id!("7744b799-c21d-48df-9a9e-fbce77c58452");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings_shard = jax.get_shard::<SettingsShard>();
        let lcu_shard = jax.get_shard::<LcuShard>();
        let ongoing_game_shard = jax.get_shard::<OngoingGameShard>();
        let tauri_host = jax.get_shard::<TauriHost>();

        let settings = self.register_settings(&settings_shard)?;

        let manager = AutoAcceptManager::new(lcu_shard);

        if self.manager.set(manager.clone()).is_err() {
            tracing::warn!("AutoAcceptShard manager already initialized");
        }

        let ongoing_manager = ongoing_game_shard
            .manager()
            .ok_or_else(|| crate::error::AppError::other("OngoingGame manager not initialized"))?;

        self.setup_runtime(settings, manager, ongoing_manager, tauri_host);

        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![SettingsShard, LcuShard, OngoingGameShard, TauriHost]
    }
}
