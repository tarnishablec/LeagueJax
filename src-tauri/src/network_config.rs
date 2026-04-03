use std::sync::Arc;
use std::time::Duration;

use crate::shards::settings::SettingsShard;

pub const REQUEST_TIMEOUT_SETTING_ID: &str = "system.network.requestTimeoutSeconds";
pub const REQUEST_TIMEOUT_DEFAULT_SECONDS: u64 = 35;

#[derive(Clone)]
pub struct NetworkConfig {
    settings: Arc<SettingsShard>,
}

impl NetworkConfig {
    pub fn new(settings: Arc<SettingsShard>) -> Self {
        Self { settings }
    }

    pub fn request_timeout(&self) -> Duration {
        let seconds = self
            .settings
            .get_setting(REQUEST_TIMEOUT_SETTING_ID)
            .ok()
            .flatten()
            .and_then(|value| value.as_u64())
            .filter(|seconds| *seconds > 0)
            .unwrap_or(REQUEST_TIMEOUT_DEFAULT_SECONDS);

        Duration::from_secs(seconds)
    }
}
