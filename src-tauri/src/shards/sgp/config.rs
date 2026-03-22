use std::collections::HashMap;
use std::sync::LazyLock;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::AppError;

#[derive(TS)]
#[ts(export, export_to = "sgp.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SgpServersConfig {
    pub version: u32,
    pub last_update: i64,
    #[serde(rename = "from", default)]
    pub source: String,
    pub servers: HashMap<String, SgpServerEndpoints>,
    #[serde(default)]
    pub tencent_server_match_history_interoperability: Vec<String>,
    #[serde(default)]
    pub tencent_server_spectator_interoperability: Vec<String>,
    #[serde(default)]
    pub tencent_server_summoner_interoperability: Vec<String>,
    #[serde(default)]
    pub server_names: HashMap<String, HashMap<String, String>>,
}

#[derive(TS)]
#[ts(export, export_to = "sgp.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SgpServerEndpoints {
    pub match_history: Option<String>,
    pub common: Option<String>,
}

static BUILTIN_SGP_CONFIG: &str = include_str!("../../../../resources/league-servers.json");
static SGP_CONFIG: LazyLock<Result<SgpServersConfig, String>> = LazyLock::new(|| {
    serde_json::from_str(BUILTIN_SGP_CONFIG)
        .map_err(|error| format!("Failed to parse builtin SGP server config: {error}"))
});

pub fn sgp_servers_config() -> Result<&'static SgpServersConfig, AppError> {
    match &*SGP_CONFIG {
        Ok(config) => Ok(config),
        Err(message) => Err(AppError::other(message.clone())),
    }
}
