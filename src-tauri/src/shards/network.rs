use std::error::Error;
use std::sync::{Arc, OnceLock};
use std::time::Duration;

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;

use crate::error::AppError;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::{SettingHandle, SettingsShard};

const REQUEST_TIMEOUT_SETTING_ID: &str = "system.network.requestTimeoutSeconds";
const REQUEST_TIMEOUT_DEFAULT_SECONDS: u64 = 35;
const USE_SYSTEM_PROXY_SETTING_ID: &str = "system.network.useSystemProxy";
const USE_SYSTEM_PROXY_DEFAULT: bool = false;

/// Runtime network policy for external HTTP requests.
///
/// This config owns generic reqwest clients that are safe to reuse across
/// features. It intentionally does not carry business headers, tokens, cookies,
/// or feature-specific TLS configuration. Local LCU traffic is not part of this
/// policy because LCU owns its per-instance TLS transport.
#[derive(Clone)]
pub struct NetworkConfig {
    request_timeout: SettingHandle,
    use_system_proxy: SettingHandle,
    direct_external_http_client: reqwest::Client,
    system_proxy_external_http_client: reqwest::Client,
}

impl NetworkConfig {
    fn new(
        request_timeout: SettingHandle,
        use_system_proxy: SettingHandle,
    ) -> Result<Self, AppError> {
        let direct_external_http_client =
            reqwest::Client::builder()
                .no_proxy()
                .build()
                .map_err(|error| {
                    AppError::other(format!(
                        "Failed to build direct external HTTP client: {error}"
                    ))
                })?;
        let system_proxy_external_http_client =
            reqwest::Client::builder().build().map_err(|error| {
                AppError::other(format!(
                    "Failed to build system proxy external HTTP client: {error}"
                ))
            })?;

        Ok(Self {
            request_timeout,
            use_system_proxy,
            direct_external_http_client,
            system_proxy_external_http_client,
        })
    }

    /// Returns the current request timeout for external HTTP requests.
    ///
    /// Callers should apply this at request time when they need live setting
    /// changes to take effect without rebuilding a reqwest client.
    pub fn request_timeout(&self) -> Duration {
        let seconds = self
            .request_timeout
            .get_value()
            .ok()
            .and_then(|value| value.as_u64())
            .filter(|seconds| *seconds > 0)
            .unwrap_or(REQUEST_TIMEOUT_DEFAULT_SECONDS);

        Duration::from_secs(seconds)
    }

    pub fn use_system_proxy(&self) -> bool {
        self.use_system_proxy
            .get_value()
            .ok()
            .and_then(|value| value.as_bool())
            .unwrap_or(USE_SYSTEM_PROXY_DEFAULT)
    }

    /// Returns the reusable external HTTP client selected by current proxy policy.
    ///
    /// The returned client is generic: callers add feature-specific headers,
    /// auth tokens, body, and per-request timeout on the request builder.
    pub fn external_http_client(&self) -> &reqwest::Client {
        if self.use_system_proxy() {
            &self.system_proxy_external_http_client
        } else {
            &self.direct_external_http_client
        }
    }
}

/// Registers and exposes app-wide network policy for external HTTP requests.
///
/// Consumers should use this shard for traffic that leaves the local machine.
/// LCU requests stay in the LCU shard because they target the local League
/// client and require per-instance TLS handling.
pub struct NetworkShard {
    config: OnceLock<Arc<NetworkConfig>>,
}

impl NetworkShard {
    pub fn new() -> Self {
        Self {
            config: OnceLock::new(),
        }
    }

    pub fn config(&self) -> Result<Arc<NetworkConfig>, AppError> {
        self.config
            .get()
            .cloned()
            .ok_or_else(|| AppError::other("Network config is not initialized"))
    }
}

impl Default for NetworkShard {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Shard for NetworkShard {
    shard_id!("8d1c4f62-9b35-4d6d-92c4-4ab530c0e1f6");
    depends![SettingsShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();

        let request_timeout = settings.register_definition(SettingDefinitionDto {
            id: REQUEST_TIMEOUT_SETTING_ID.to_string(),
            label_key: "settings.network.requestTimeoutSeconds.label".to_string(),
            hint_key: None,
            scope: SettingScopeDto::Shared,
            control: Some(SettingControlDto::Number {
                placeholder_key: None,
                min: Some(1.0),
                max: Some(300.0),
                step: Some(1.0),
            }),
            default_value: Value::Number(serde_json::Number::from(REQUEST_TIMEOUT_DEFAULT_SECONDS)),
            order: Some(10),
            visible: Some(true),
            options: None,
        })?;

        let use_system_proxy = settings.register_definition(SettingDefinitionDto {
            id: USE_SYSTEM_PROXY_SETTING_ID.to_string(),
            label_key: "settings.network.useSystemProxy.label".to_string(),
            hint_key: Some("settings.network.useSystemProxy.hint".to_string()),
            scope: SettingScopeDto::Backend,
            control: Some(SettingControlDto::Toggle),
            default_value: Value::Bool(USE_SYSTEM_PROXY_DEFAULT),
            order: Some(20),
            visible: Some(true),
            options: None,
        })?;

        if self
            .config
            .set(Arc::new(NetworkConfig::new(
                request_timeout,
                use_system_proxy,
            )?))
            .is_err()
        {
            return Err(AppError::other("Network config is already initialized").into());
        }

        Ok(())
    }
}
