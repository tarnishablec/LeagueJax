use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use tauri::{Manager, WebviewWindow};
#[cfg(target_os = "macos")]
use window_vibrancy::apply_acrylic;
#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, apply_mica, clear_acrylic, clear_mica};

use crate::error::AppError;
use crate::shards::settings::types::{
    SettingControlDto, SettingDefinitionDto, SettingOptionDto, SettingScopeDto,
};
use crate::shards::settings::SettingsShard;
use crate::shards::tauri_host::TauriHost;

const WINDOW_EFFECT_SETTING_ID: &str = "system.preferences.windowEffect";
const WINDOW_EFFECT_MICA: &str = "mica";
const WINDOW_EFFECT_ACRYLIC: &str = "acrylic";
const WINDOW_EFFECT_VIBRANCY: &str = "vibrancy";
const WINDOW_EFFECT_NONE: &str = "none";
const ACRYLIC_TINT: Option<(u8, u8, u8, u8)> = Some((18, 18, 28, 160));
#[cfg(target_os = "windows")]
const WINDOW_EFFECT_DEFAULT: &str = WINDOW_EFFECT_MICA;
#[cfg(target_os = "macos")]
const WINDOW_EFFECT_DEFAULT: &str = WINDOW_EFFECT_VIBRANCY;
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
const WINDOW_EFFECT_DEFAULT: &str = WINDOW_EFFECT_NONE;

pub struct WindowEffectShard {
    settings: OnceLock<Arc<SettingsShard>>,
}

#[derive(Debug, Clone, Copy)]
enum WindowEffect {
    None,
    #[cfg(target_os = "windows")]
    Mica,
    #[cfg(target_os = "windows")]
    Acrylic,
    #[cfg(target_os = "macos")]
    Vibrancy,
}

impl WindowEffect {
    fn from_setting_value(value: Option<&Value>) -> Self {
        match value.and_then(Value::as_str) {
            Some(WINDOW_EFFECT_NONE) => Self::None,
            #[cfg(target_os = "windows")]
            Some(WINDOW_EFFECT_MICA) => Self::Mica,
            #[cfg(target_os = "windows")]
            Some(WINDOW_EFFECT_ACRYLIC) | Some(WINDOW_EFFECT_VIBRANCY) => Self::Acrylic,
            #[cfg(target_os = "macos")]
            Some(WINDOW_EFFECT_VIBRANCY)
            | Some(WINDOW_EFFECT_ACRYLIC)
            | Some(WINDOW_EFFECT_MICA) => Self::Vibrancy,
            _ => Self::default_for_platform(),
        }
    }

    fn default_for_platform() -> Self {
        #[cfg(target_os = "windows")]
        {
            return Self::Mica;
        }
        #[cfg(target_os = "macos")]
        {
            return Self::Vibrancy;
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            Self::None
        }
    }
}

fn build_window_effect_options() -> Vec<SettingOptionDto> {
    let mut options = vec![SettingOptionDto {
        value: WINDOW_EFFECT_NONE.to_string(),
        label_key: "settings.windowEffect.options.none".to_string(),
        display_label: None,
    }];

    #[cfg(target_os = "windows")]
    {
        options.push(SettingOptionDto {
            value: WINDOW_EFFECT_MICA.to_string(),
            label_key: "settings.windowEffect.options.mica".to_string(),
            display_label: None,
        });
        options.push(SettingOptionDto {
            value: WINDOW_EFFECT_ACRYLIC.to_string(),
            label_key: "settings.windowEffect.options.acrylic".to_string(),
            display_label: None,
        });
    }

    #[cfg(target_os = "macos")]
    {
        options.push(SettingOptionDto {
            value: WINDOW_EFFECT_VIBRANCY.to_string(),
            label_key: "settings.windowEffect.options.vibrancy".to_string(),
            display_label: None,
        });
    }

    options
}

impl WindowEffectShard {
    pub fn new() -> Self {
        Self {
            settings: OnceLock::new(),
        }
    }

    fn current_window_effect(&self) -> Result<WindowEffect, AppError> {
        let settings = self
            .settings
            .get()
            .ok_or_else(|| AppError::other("window effect settings shard is not initialized"))?;
        let value = settings.get_value(WINDOW_EFFECT_SETTING_ID)?;
        Ok(WindowEffect::from_setting_value(value.as_ref()))
    }

    pub fn apply_current_to_window(&self, window: &WebviewWindow) -> Result<(), AppError> {
        let effect = self.current_window_effect()?;
        Self::apply_effect_to_window(window, effect)
    }

    fn apply_effect_to_windows(
        app: &tauri::AppHandle,
        effect: WindowEffect,
    ) -> Result<(), AppError> {
        for window in app.webview_windows().values() {
            Self::apply_effect_to_window(window, effect)?;
        }

        Ok(())
    }

    fn apply_effect_to_window(
        window: &WebviewWindow,
        effect: WindowEffect,
    ) -> Result<(), AppError> {
        #[cfg(target_os = "windows")]
        {
            let _ = clear_mica(window);
            let _ = clear_acrylic(window);

            return match effect {
                WindowEffect::None => Ok(()),
                WindowEffect::Mica => {
                    if let Err(error) = apply_mica(window, None) {
                        tracing::warn!(error = %error, "Failed to apply mica, fallback to acrylic");
                        apply_acrylic(window, ACRYLIC_TINT).map_err(|fallback_error| {
                            AppError::other(format!(
                                "failed to apply acrylic fallback: {fallback_error}"
                            ))
                        })?;
                    }
                    Ok(())
                }
                WindowEffect::Acrylic => apply_acrylic(window, ACRYLIC_TINT)
                    .map_err(|error| AppError::other(format!("failed to apply acrylic: {error}"))),
            };
        }

        #[cfg(target_os = "macos")]
        {
            return match effect {
                WindowEffect::None => Ok(()),
                WindowEffect::Vibrancy => apply_acrylic(window, ACRYLIC_TINT)
                    .map_err(|error| AppError::other(format!("failed to apply acrylic: {error}"))),
            };
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            let _ = window;
            let _ = effect;
            Ok(())
        }
    }
}

impl Default for WindowEffectShard {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Shard for WindowEffectShard {
    shard_id!("2d01df95-cc4e-4d0f-a2a6-c560db81de43");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let host = jax.get_shard::<TauriHost>();
        let settings = jax.get_shard::<SettingsShard>().clone();
        let app = host.app.clone();

        if self.settings.set(settings.clone()).is_err() {
            tracing::warn!("WindowEffectShard settings shard was already initialized");
        }

        let effect_handle = settings.register_definition(SettingDefinitionDto {
            id: WINDOW_EFFECT_SETTING_ID.to_string(),
            label_key: "settings.windowEffect.label".to_string(),
            hint_key: Some("settings.windowEffect.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: SettingControlDto::Select,
            default_value: Value::String(WINDOW_EFFECT_DEFAULT.to_string()),
            order: Some(30),
            visible: Some(true),
            options: Some(build_window_effect_options()),
        })?;

        let startup_effect = WindowEffect::from_setting_value(Some(&effect_handle.get_value()?));
        if let Err(error) = Self::apply_effect_to_windows(&app, startup_effect) {
            tracing::warn!(error = %error, "Failed to apply startup window effect");
        }

        effect_handle.spawn_watch(false, move |value| {
            let app = app.clone();
            async move {
                let effect = WindowEffect::from_setting_value(Some(&value));
                if let Err(error) = WindowEffectShard::apply_effect_to_windows(&app, effect) {
                    tracing::warn!(
                        error = %error,
                        "Failed to apply window effect after settings change"
                    );
                }
            }
        })?;

        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        depends![TauriHost, SettingsShard]
    }
}
