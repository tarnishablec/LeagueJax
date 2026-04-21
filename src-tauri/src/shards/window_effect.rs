use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
#[cfg(target_os = "windows")]
use tauri::Theme;
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
const SYSTEM_THEME_SETTING_ID: &str = "system.preferences.theme";
const SYSTEM_THEME_SYSTEM: &str = "system";
const SYSTEM_THEME_LIGHT: &str = "light";
const SYSTEM_THEME_DARK: &str = "dark";
#[cfg(target_os = "windows")]
const ACRYLIC_TINT_LIGHT: Option<(u8, u8, u8, u8)> = Some((248, 248, 248, 120));
#[cfg(target_os = "windows")]
const ACRYLIC_TINT_DARK: Option<(u8, u8, u8, u8)> = Some((32, 32, 32, 160));
#[cfg(target_os = "macos")]
const VIBRANCY_TINT: Option<(u8, u8, u8, u8)> = Some((18, 18, 28, 160));
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
            Self::Mica
        }
        #[cfg(target_os = "macos")]
        {
            Self::Vibrancy
        }
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            Self::None
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum ThemePreference {
    System,
    Light,
    Dark,
}

impl ThemePreference {
    fn from_setting_value(value: Option<&Value>) -> Self {
        match value.and_then(Value::as_str) {
            Some(SYSTEM_THEME_LIGHT) => Self::Light,
            Some(SYSTEM_THEME_DARK) => Self::Dark,
            _ => Self::System,
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

fn build_theme_options() -> Vec<SettingOptionDto> {
    vec![
        SettingOptionDto {
            value: SYSTEM_THEME_SYSTEM.to_string(),
            label_key: "settings.theme.system".to_string(),
            display_label: None,
        },
        SettingOptionDto {
            value: SYSTEM_THEME_LIGHT.to_string(),
            label_key: "settings.theme.light".to_string(),
            display_label: None,
        },
        SettingOptionDto {
            value: SYSTEM_THEME_DARK.to_string(),
            label_key: "settings.theme.dark".to_string(),
            display_label: None,
        },
    ]
}

fn build_theme_setting_definition() -> SettingDefinitionDto {
    SettingDefinitionDto {
        id: SYSTEM_THEME_SETTING_ID.to_string(),
        label_key: "settings.theme.label".to_string(),
        hint_key: None,
        scope: SettingScopeDto::Frontend,
        control: SettingControlDto::Select,
        default_value: Value::String(SYSTEM_THEME_SYSTEM.to_string()),
        order: Some(20),
        visible: Some(true),
        options: Some(build_theme_options()),
    }
}

impl WindowEffectShard {
    pub fn new() -> Self {
        Self {
            settings: OnceLock::new(),
        }
    }

    fn settings(&self) -> Result<&Arc<SettingsShard>, AppError> {
        self.settings
            .get()
            .ok_or_else(|| AppError::other("window effect settings shard is not initialized"))
    }

    fn window_effect_from_settings(settings: &SettingsShard) -> Result<WindowEffect, AppError> {
        let value = settings.get_value(WINDOW_EFFECT_SETTING_ID)?;
        Ok(WindowEffect::from_setting_value(value.as_ref()))
    }

    fn theme_preference_from_settings(
        settings: &SettingsShard,
    ) -> Result<ThemePreference, AppError> {
        let value = settings.get_value(SYSTEM_THEME_SETTING_ID)?;
        Ok(ThemePreference::from_setting_value(value.as_ref()))
    }

    pub fn apply_current_to_window(&self, window: &WebviewWindow) -> Result<(), AppError> {
        let settings = self.settings()?;
        let effect = Self::window_effect_from_settings(settings)?;
        let theme_preference = Self::theme_preference_from_settings(settings)?;
        Self::apply_effect_to_window(window, effect, theme_preference)
    }

    fn apply_current_effect_to_windows(
        app: &tauri::AppHandle,
        settings: &SettingsShard,
    ) -> Result<(), AppError> {
        let effect = Self::window_effect_from_settings(settings)?;
        Self::apply_effect_to_windows(app, settings, effect)
    }

    fn apply_effect_to_windows(
        app: &tauri::AppHandle,
        settings: &SettingsShard,
        effect: WindowEffect,
    ) -> Result<(), AppError> {
        let theme_preference = Self::theme_preference_from_settings(settings)?;
        for window in app.webview_windows().values() {
            Self::apply_effect_to_window(window, effect, theme_preference)?;
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn acrylic_tint_for_window(
        window: &WebviewWindow,
        theme_preference: ThemePreference,
    ) -> Option<(u8, u8, u8, u8)> {
        let is_dark = match theme_preference {
            ThemePreference::Dark => true,
            ThemePreference::Light => false,
            ThemePreference::System => match window.theme() {
                Ok(Theme::Dark) => true,
                Ok(Theme::Light) => false,
                Ok(_) => true,
                Err(error) => {
                    tracing::warn!(
                        error = %error,
                        "Failed to read window theme, fallback to dark acrylic tint"
                    );
                    true
                }
            },
        };

        if is_dark {
            ACRYLIC_TINT_DARK
        } else {
            ACRYLIC_TINT_LIGHT
        }
    }

    fn apply_effect_to_window(
        window: &WebviewWindow,
        effect: WindowEffect,
        theme_preference: ThemePreference,
    ) -> Result<(), AppError> {
        #[cfg(target_os = "windows")]
        {
            let acrylic_tint = Self::acrylic_tint_for_window(window, theme_preference);
            let _ = clear_mica(window);
            let _ = clear_acrylic(window);

            match effect {
                WindowEffect::None => Ok(()),
                WindowEffect::Mica => {
                    if let Err(error) = apply_mica(window, None) {
                        tracing::warn!(error = %error, "Failed to apply mica, fallback to acrylic");
                        apply_acrylic(window, acrylic_tint).map_err(|fallback_error| {
                            AppError::other(format!(
                                "failed to apply acrylic fallback: {fallback_error}"
                            ))
                        })?;
                    }
                    Ok(())
                }
                WindowEffect::Acrylic => apply_acrylic(window, acrylic_tint)
                    .map_err(|error| AppError::other(format!("failed to apply acrylic: {error}"))),
            }
        }

        #[cfg(target_os = "macos")]
        {
            let _ = theme_preference;
            return match effect {
                WindowEffect::None => Ok(()),
                WindowEffect::Vibrancy => apply_acrylic(window, VIBRANCY_TINT)
                    .map_err(|error| AppError::other(format!("failed to apply acrylic: {error}"))),
            };
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            let _ = window;
            let _ = effect;
            let _ = theme_preference;
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

        settings.register_definition(build_theme_setting_definition())?;

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

        let theme_handle = settings.setting_handle(SYSTEM_THEME_SETTING_ID)?;

        if let Err(error) = Self::apply_current_effect_to_windows(&app, &settings) {
            tracing::warn!(error = %error, "Failed to apply startup window effect");
        }

        let app_for_effect_watch = app.clone();
        let settings_for_effect_watch = settings.clone();
        effect_handle.spawn_watch(false, move |value| {
            let app = app_for_effect_watch.clone();
            let settings = settings_for_effect_watch.clone();
            async move {
                let effect = WindowEffect::from_setting_value(Some(&value));
                if let Err(error) =
                    WindowEffectShard::apply_effect_to_windows(&app, &settings, effect)
                {
                    tracing::warn!(
                        error = %error,
                        "Failed to apply window effect after settings change"
                    );
                }
            }
        })?;

        let app_for_theme_watch = app.clone();
        let settings_for_theme_watch = settings.clone();
        theme_handle.spawn_watch(false, move |_value| {
            let app = app_for_theme_watch.clone();
            let settings = settings_for_theme_watch.clone();
            async move {
                if let Err(error) =
                    WindowEffectShard::apply_current_effect_to_windows(&app, &settings)
                {
                    tracing::warn!(
                        error = %error,
                        "Failed to reapply window effect after theme change"
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
