use std::error::Error;
use std::sync::Arc;
use std::sync::OnceLock;

use async_trait::async_trait;
use futures_util::stream::{FuturesUnordered, StreamExt};
use jax::{depends, shard_id, Jax, Shard};
use reqwest::Client;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Emitter;
use tauri_plugin_updater::{Update, UpdaterExt};
use tokio::sync::Mutex;
use tokio::sync::RwLock;
use ts_rs::TS;

use crate::error::AppError;
use crate::shards::network::{NetworkConfig, NetworkShard};
use crate::shards::settings::types::{
    SettingControlDto, SettingDefinitionDto, SettingOptionDto, SettingScopeDto,
};
use crate::shards::settings::SettingsShard;
use crate::shards::tauri_host::TauriHost;

const UPDATE_SOURCE_SETTING_ID: &str = "system.update.source";
const AUTO_CHECK_SETTING_ID: &str = "system.update.autoCheckOnStartup";
const GITHUB_RELEASE_API: &str =
    "https://api.github.com/repos/tarnishablec/LeagueJax/releases/latest";
const GITEE_RELEASE_API: &str =
    "https://gitee.com/api/v5/repos/tarnishablec/league-jax-releases/releases/latest";
// Note:
// `src-tauri/tauri.conf.json` also contains a default updater endpoint, so the plugin
// stays fully configured. The settings-driven updater flow does not use that default
// endpoint directly. Instead, this shard resolves the active source at runtime and
// overrides the endpoint through `UpdaterBuilder::endpoints(...)`.
const GITHUB_RELEASES_BASE: &str = "https://github.com/tarnishablec/LeagueJax";
const GITEE_RELEASES_BASE: &str = "https://gitee.com/tarnishablec/league-jax-releases";
const USER_AGENT: &str = "league-jax-updater";

#[derive(TS)]
#[ts(export, export_to = "updater.ts")]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum UpdaterSourceDto {
    Auto,
    Gitee,
    Github,
}

impl UpdaterSourceDto {
    fn as_setting_value(self) -> &'static str {
        match self {
            Self::Auto => "auto",
            Self::Gitee => "gitee",
            Self::Github => "github",
        }
    }

    fn from_setting_value(value: Option<&str>) -> Self {
        match value {
            Some("gitee") => Self::Gitee,
            Some("github") => Self::Github,
            _ => Self::Auto,
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Auto => "auto",
            Self::Gitee => "gitee",
            Self::Github => "github",
        }
    }
}

#[derive(TS)]
#[ts(export, export_to = "updater.ts")]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum UpdaterStatusKindDto {
    Idle,
    Checking,
    UpToDate,
    UpdateAvailable,
    Installing,
    Error,
}

#[derive(TS)]
#[ts(export, export_to = "updater.ts")]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdaterStateDto {
    pub kind: UpdaterStatusKindDto,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub notes: Option<String>,
    pub source: Option<UpdaterSourceDto>,
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ReleaseLookupDto {
    tag_name: String,
}

#[derive(Debug, Clone, Deserialize)]
struct LatestManifestDto {
    version: String,
    notes: Option<String>,
    platforms: std::collections::BTreeMap<String, LatestManifestPlatformDto>,
}

#[derive(Debug, Clone, Deserialize)]
struct LatestManifestPlatformDto {
    signature: String,
    url: String,
}

struct ManifestProbe {
    source: UpdaterSourceDto,
    manifest_url: String,
    manifest: LatestManifestDto,
}

pub struct UpdaterShard {
    app: OnceLock<tauri::AppHandle>,
    settings: OnceLock<Arc<SettingsShard>>,
    network_config: OnceLock<Arc<NetworkConfig>>,
    state: RwLock<UpdaterStateDto>,
    pending_update: Mutex<Option<Update>>,
    action_lock: Mutex<()>,
}

impl UpdaterShard {
    pub fn new() -> Self {
        Self {
            app: OnceLock::new(),
            settings: OnceLock::new(),
            network_config: OnceLock::new(),
            state: RwLock::new(UpdaterStateDto {
                kind: UpdaterStatusKindDto::Idle,
                current_version: String::new(),
                latest_version: None,
                notes: None,
                source: None,
                message: None,
            }),
            pending_update: Mutex::new(None),
            action_lock: Mutex::new(()),
        }
    }

    pub async fn get_state(&self) -> UpdaterStateDto {
        self.state.read().await.clone()
    }

    pub async fn run_action(&self) -> Result<UpdaterStateDto, AppError> {
        let _guard = self.action_lock.lock().await;
        let current = self.get_state().await;

        if matches!(current.kind, UpdaterStatusKindDto::UpdateAvailable) {
            self.install_pending_update_locked().await
        } else {
            self.check_for_updates_locked().await
        }
    }

    pub async fn check_for_updates(&self) -> Result<UpdaterStateDto, AppError> {
        let _guard = self.action_lock.lock().await;
        self.check_for_updates_locked().await
    }

    pub async fn clear_pending_and_reset(&self) -> Result<(), AppError> {
        let _guard = self.action_lock.lock().await;

        {
            let mut pending = self.pending_update.lock().await;
            *pending = None;
        }

        self.set_state(UpdaterStateDto {
            kind: UpdaterStatusKindDto::Idle,
            current_version: self.current_version()?,
            latest_version: None,
            notes: None,
            source: None,
            message: None,
        })
        .await
    }

    async fn check_for_updates_locked(&self) -> Result<UpdaterStateDto, AppError> {
        self.set_state(UpdaterStateDto {
            kind: UpdaterStatusKindDto::Checking,
            current_version: self.current_version()?,
            latest_version: None,
            notes: None,
            source: None,
            message: None,
        })
        .await?;

        let probe = match self.select_manifest_probe().await {
            Ok(probe) => probe,
            Err(error) => {
                let message = error.to_string();
                self.set_state(UpdaterStateDto {
                    kind: UpdaterStatusKindDto::Error,
                    current_version: self.current_version().unwrap_or_default(),
                    latest_version: None,
                    notes: None,
                    source: None,
                    message: Some(message),
                })
                .await?;
                return Err(error);
            }
        };

        // Runtime source selection (`auto` / `gitee` / `github`) is applied here.
        // This endpoint list overrides the static default endpoint from tauri.conf.json.
        let app = self.app_handle()?;
        let updater = app
            .updater_builder()
            .no_proxy()
            .timeout(self.network_config()?.request_timeout())
            .endpoints(vec![Url::parse(&probe.manifest_url).map_err(|error| {
                AppError::other(format!("Invalid updater endpoint: {error}"))
            })?])
            .map_err(|error| {
                AppError::other(format!("Failed to configure updater endpoints: {error}"))
            })?
            .build()
            .map_err(|error| AppError::other(format!("Failed to build updater: {error}")))?;

        let maybe_update = updater
            .check()
            .await
            .map_err(|error| AppError::other(format!("Failed to check update: {error}")))?;

        match maybe_update {
            Some(update) => {
                {
                    let mut pending = self.pending_update.lock().await;
                    *pending = Some(update.clone());
                }

                let next = UpdaterStateDto {
                    kind: UpdaterStatusKindDto::UpdateAvailable,
                    current_version: update.current_version.clone(),
                    latest_version: Some(update.version.clone()),
                    notes: update.body.clone().or(probe.manifest.notes.clone()),
                    source: Some(probe.source),
                    message: None,
                };
                self.set_state(next.clone()).await?;
                Ok(next)
            }
            None => {
                {
                    let mut pending = self.pending_update.lock().await;
                    *pending = None;
                }

                let next = UpdaterStateDto {
                    kind: UpdaterStatusKindDto::UpToDate,
                    current_version: self.current_version()?,
                    latest_version: Some(probe.manifest.version),
                    notes: None,
                    source: Some(probe.source),
                    message: None,
                };
                self.set_state(next.clone()).await?;
                Ok(next)
            }
        }
    }

    async fn install_pending_update_locked(&self) -> Result<UpdaterStateDto, AppError> {
        let current = self.get_state().await;
        let mut pending = self.pending_update.lock().await;
        let update = if let Some(update) = pending.take() {
            update
        } else {
            drop(pending);
            let next = UpdaterStateDto {
                kind: UpdaterStatusKindDto::Idle,
                current_version: self.current_version()?,
                latest_version: None,
                notes: None,
                source: None,
                message: None,
            };
            self.set_state(next.clone()).await?;
            return Ok(next);
        };
        drop(pending);

        let installing_state = UpdaterStateDto {
            kind: UpdaterStatusKindDto::Installing,
            current_version: current.current_version,
            latest_version: current.latest_version.clone(),
            notes: current.notes.clone(),
            source: current.source,
            message: None,
        };
        self.set_state(installing_state.clone()).await?;

        let install_result = update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|error| AppError::other(format!("Failed to install update: {error}")));

        if let Err(error) = install_result {
            {
                let mut pending = self.pending_update.lock().await;
                *pending = Some(update);
            }

            let next = UpdaterStateDto {
                kind: UpdaterStatusKindDto::Error,
                current_version: installing_state.current_version.clone(),
                latest_version: installing_state.latest_version.clone(),
                notes: installing_state.notes.clone(),
                source: installing_state.source,
                message: Some(error.to_string()),
            };
            self.set_state(next.clone()).await?;
            return Err(error);
        }

        #[cfg(not(target_os = "windows"))]
        {
            self.app_handle()?.restart();
        }

        Ok(installing_state)
    }

    async fn select_manifest_probe(&self) -> Result<ManifestProbe, AppError> {
        match self.selected_source()? {
            UpdaterSourceDto::Auto => self.probe_fastest_source().await,
            source => self.fetch_manifest_probe(source).await,
        }
    }

    async fn probe_fastest_source(&self) -> Result<ManifestProbe, AppError> {
        let mut probes = FuturesUnordered::new();
        probes.push(self.fetch_manifest_probe(UpdaterSourceDto::Gitee));
        probes.push(self.fetch_manifest_probe(UpdaterSourceDto::Github));

        let mut errors = Vec::new();
        while let Some(result) = probes.next().await {
            match result {
                Ok(probe) => return Ok(probe),
                Err(error) => errors.push(error.to_string()),
            }
        }

        Err(AppError::other(format!(
            "No updater source is available: {}",
            errors.join(" | ")
        )))
    }

    async fn fetch_manifest_probe(
        &self,
        source: UpdaterSourceDto,
    ) -> Result<ManifestProbe, AppError> {
        let client = Client::builder()
            .no_proxy()
            .user_agent(USER_AGENT)
            .timeout(self.network_config()?.request_timeout())
            .build()
            .map_err(|error| AppError::other(format!("Failed to build updater client: {error}")))?;

        let release_lookup = client
            .get(Self::latest_release_api(source))
            .send()
            .await
            .map_err(|error| {
                AppError::other(format!(
                    "Failed to fetch {} release: {error}",
                    source.label()
                ))
            })?
            .error_for_status()
            .map_err(|error| {
                AppError::other(format!(
                    "Failed to resolve {} release: {error}",
                    source.label()
                ))
            })?
            .json::<ReleaseLookupDto>()
            .await
            .map_err(|error| {
                AppError::other(format!(
                    "Invalid {} release payload: {error}",
                    source.label()
                ))
            })?;

        let manifest_url = format!(
            "{}/releases/download/{}/latest.json",
            Self::releases_base(source),
            release_lookup.tag_name
        );
        let manifest = client
            .get(&manifest_url)
            .send()
            .await
            .map_err(|error| {
                AppError::other(format!(
                    "Failed to fetch {} manifest: {error}",
                    source.label()
                ))
            })?
            .error_for_status()
            .map_err(|error| {
                AppError::other(format!(
                    "Failed to resolve {} manifest: {error}",
                    source.label()
                ))
            })?
            .json::<LatestManifestDto>()
            .await
            .map_err(|error| {
                AppError::other(format!("Invalid {} latest.json: {error}", source.label()))
            })?;

        let platform = Self::current_platform_key()?;
        let Some(platform_entry) = manifest.platforms.get(&platform) else {
            return Err(AppError::other(format!(
                "{} latest.json does not include platform {}",
                source.label(),
                platform
            )));
        };

        if platform_entry.signature.trim().is_empty() || platform_entry.url.trim().is_empty() {
            return Err(AppError::other(format!(
                "{} latest.json is missing updater asset metadata",
                source.label()
            )));
        }

        Ok(ManifestProbe {
            source,
            manifest_url,
            manifest,
        })
    }

    async fn set_state(&self, next: UpdaterStateDto) -> Result<(), AppError> {
        {
            let mut state = self.state.write().await;
            *state = next.clone();
        }

        self.app_handle()?
            .emit("updater_state_changed", next)
            .map_err(|error| AppError::other(format!("Failed to emit updater state: {error}")))
    }

    fn selected_source(&self) -> Result<UpdaterSourceDto, AppError> {
        let settings = self.settings()?;
        let value = settings
            .get_value(UPDATE_SOURCE_SETTING_ID)?
            .and_then(|value| value.as_str().map(ToOwned::to_owned));
        Ok(UpdaterSourceDto::from_setting_value(value.as_deref()))
    }

    fn settings(&self) -> Result<Arc<SettingsShard>, AppError> {
        self.settings
            .get()
            .cloned()
            .ok_or_else(|| AppError::other("Updater settings shard is not initialized"))
    }

    fn network_config(&self) -> Result<Arc<NetworkConfig>, AppError> {
        self.network_config
            .get()
            .cloned()
            .ok_or_else(|| AppError::other("Updater network config is not initialized"))
    }

    fn app_handle(&self) -> Result<tauri::AppHandle, AppError> {
        self.app
            .get()
            .cloned()
            .ok_or_else(|| AppError::other("Updater app handle is not initialized"))
    }

    fn current_version(&self) -> Result<String, AppError> {
        Ok(self.app_handle()?.package_info().version.to_string())
    }

    fn latest_release_api(source: UpdaterSourceDto) -> &'static str {
        match source {
            UpdaterSourceDto::Auto => GITEE_RELEASE_API,
            UpdaterSourceDto::Gitee => GITEE_RELEASE_API,
            UpdaterSourceDto::Github => GITHUB_RELEASE_API,
        }
    }

    fn releases_base(source: UpdaterSourceDto) -> &'static str {
        match source {
            UpdaterSourceDto::Auto => GITEE_RELEASES_BASE,
            UpdaterSourceDto::Gitee => GITEE_RELEASES_BASE,
            UpdaterSourceDto::Github => GITHUB_RELEASES_BASE,
        }
    }

    fn current_platform_key() -> Result<String, AppError> {
        let os = match std::env::consts::OS {
            "windows" => "windows",
            "macos" => "darwin",
            "linux" => "linux",
            other => {
                return Err(AppError::other(format!(
                    "Unsupported updater platform {}",
                    other
                )))
            }
        };

        let arch = match std::env::consts::ARCH {
            "x86_64" => "x86_64",
            "x86" => "i686",
            "aarch64" => "aarch64",
            "arm" => "armv7",
            other => {
                return Err(AppError::other(format!(
                    "Unsupported updater architecture {}",
                    other
                )))
            }
        };

        Ok(format!("{os}-{arch}"))
    }
}

impl Default for UpdaterShard {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Shard for UpdaterShard {
    shard_id!("0adeb8a1-2f80-41af-a381-a852a08e1ab5");
    depends![SettingsShard, TauriHost, NetworkShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let tauri_host = jax.get_shard::<TauriHost>();
        let network = jax.get_shard::<NetworkShard>();

        self.settings
            .set(Arc::clone(&settings))
            .map_err(|_| AppError::other("Updater settings shard already initialized"))?;
        self.network_config
            .set(network.config()?)
            .map_err(|_| AppError::other("Updater network config already initialized"))?;
        self.app
            .set(tauri_host.app.clone())
            .map_err(|_| AppError::other("Updater app handle already initialized"))?;

        settings.register_definition(SettingDefinitionDto {
            id: UPDATE_SOURCE_SETTING_ID.to_string(),
            label_key: "settings.update.source.label".to_string(),
            hint_key: Some("settings.update.source.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: Some(SettingControlDto::Select),
            default_value: Value::String(UpdaterSourceDto::Auto.as_setting_value().to_string()),
            order: Some(10),
            visible: Some(true),
            options: Some(vec![
                SettingOptionDto {
                    value: "auto".to_string(),
                    label_key: "settings.update.source.options.auto".to_string(),
                    display_label: None,
                },
                SettingOptionDto {
                    value: "gitee".to_string(),
                    label_key: "settings.update.source.options.gitee".to_string(),
                    display_label: None,
                },
                SettingOptionDto {
                    value: "github".to_string(),
                    label_key: "settings.update.source.options.github".to_string(),
                    display_label: None,
                },
            ]),
        })?;

        let auto_check_handle = settings.register_definition(SettingDefinitionDto {
            id: AUTO_CHECK_SETTING_ID.to_string(),
            label_key: "settings.update.autoCheckOnStartup.label".to_string(),
            hint_key: Some("settings.update.autoCheckOnStartup.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: Some(SettingControlDto::Toggle),
            default_value: Value::Bool(true),
            order: Some(20),
            visible: Some(true),
            options: None,
        })?;

        {
            let mut state = self.state.write().await;
            state.current_version = self.current_version()?;
        }

        let updater = jax.get_shard::<UpdaterShard>();
        let source_handle = settings.setting_handle(UPDATE_SOURCE_SETTING_ID)?;
        source_handle.spawn_watch(false, move |_| {
            let updater = Arc::clone(&updater);
            async move {
                if let Err(error) = updater.clear_pending_and_reset().await {
                    tracing::error!(error = %error, "Failed to reset updater state after source change");
                }
            }
        })?;

        let auto_check_on_startup = auto_check_handle.get_value()?.as_bool().unwrap_or(false);
        if auto_check_on_startup {
            let updater = jax.get_shard::<UpdaterShard>();
            tauri_host.spawn(async move {
                if let Err(error) = updater.check_for_updates().await {
                    tracing::warn!(error = %error, "Automatic update check failed");
                }
            });
        }

        Ok(())
    }
}
