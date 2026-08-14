use std::sync::Arc;

use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::{Client, Method, StatusCode};
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::{Value, Value as JsonValue};

use super::auth::LcuAuth;
use super::tls::build_local_client_tls_config;
use crate::error::AppError;
use crate::shards::network::NetworkConfig;
use crate::utils::league_cmd_arg::LeagueClientCmdArgs;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAccountAliasEntry {
    pub alias: PlayerAccountAlias,
    pub puuid: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PlayerAccountAlias {
    #[serde(default, rename = "game_name")]
    pub game_name: String,
    #[serde(default, rename = "tag_line")]
    pub tag_line: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAccountNamesetResponse {
    #[serde(default)]
    pub namesets: Vec<PlayerAccountNameset>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAccountNameset {
    pub puuid: String,
    pub gnt: PlayerAccountGnt,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerAccountGnt {
    #[serde(default)]
    pub game_name: String,
    #[serde(default)]
    pub tag_line: String,
}

struct RiotClientJsonResponse {
    status: StatusCode,
    body: Value,
}

impl RiotClientJsonResponse {
    fn ensure_success(&self, method: &Method, path: &str) -> Result<(), AppError> {
        if self.status.is_success() {
            return Ok(());
        }

        let error_code = self
            .body
            .get("errorCode")
            .and_then(|value| value.as_str())
            .unwrap_or_default();
        let message = self
            .body
            .get("message")
            .and_then(|value| value.as_str())
            .unwrap_or_default();
        let detail = match (error_code.is_empty(), message.is_empty()) {
            (false, false) => format!(" ({error_code}): {message}"),
            (false, true) => format!(" ({error_code})"),
            (true, false) => format!(": {message}"),
            (true, true) => format!(": {}", response_body_preview(&self.body)),
        };

        Err(AppError::other(format!(
            "Riot Client request failed: {} {} returned {}{}",
            method.as_str(),
            path,
            self.status,
            detail
        )))
    }
}

pub struct RiotClientHttpClient {
    req_client: Client,
    base_url: String,
    auth_header: String,
    network_config: Arc<NetworkConfig>,
}

impl RiotClientHttpClient {
    pub fn new(auth: &LcuAuth, network_config: Arc<NetworkConfig>) -> Result<Self, AppError> {
        let (port, token) = riot_client_auth(auth)?;
        let tls_config = build_local_client_tls_config(auth.pid, "riot-client");
        let req_client = Client::builder()
            .use_preconfigured_tls(tls_config)
            .build()
            .map_err(|source| AppError::LcuRequest { source })?;
        let encoded = STANDARD.encode(format!("riot:{token}"));

        Ok(Self {
            req_client,
            base_url: format!("https://127.0.0.1:{port}"),
            auth_header: format!("Basic {encoded}"),
            network_config,
        })
    }

    pub async fn get_player_account_aliases(
        &self,
        game_name: &str,
        tag_line: Option<&str>,
    ) -> Result<Vec<PlayerAccountAliasEntry>, AppError> {
        let mut query = vec![("gameName", game_name.to_string())];
        if let Some(tag_line) = tag_line {
            query.push(("tagLine", tag_line.to_string()));
        }

        let response = self
            .request(
                Method::GET,
                "/player-account/aliases/v1/lookup",
                query,
                None,
            )
            .await?;
        if response.status == StatusCode::NOT_FOUND {
            return Ok(Vec::new());
        }
        response.ensure_success(&Method::GET, "/player-account/aliases/v1/lookup")?;
        deserialize_json(response.body)
    }

    pub async fn get_player_account_namesets(
        &self,
        puuids: &[String],
    ) -> Result<PlayerAccountNamesetResponse, AppError> {
        if puuids.is_empty() {
            return Ok(PlayerAccountNamesetResponse { namesets: vec![] });
        }

        let response = self
            .request(
                Method::POST,
                "/player-account/lookup/v1/namesets-for-puuids",
                Vec::new(),
                Some(serde_json::json!({ "puuids": puuids })),
            )
            .await?;
        if response.status == StatusCode::NOT_FOUND {
            return Ok(PlayerAccountNamesetResponse { namesets: vec![] });
        }
        response.ensure_success(
            &Method::POST,
            "/player-account/lookup/v1/namesets-for-puuids",
        )?;
        deserialize_json(response.body)
    }

    async fn request(
        &self,
        method: Method,
        path: &str,
        query: Vec<(&str, String)>,
        body: Option<Value>,
    ) -> Result<RiotClientJsonResponse, AppError> {
        let mut url =
            reqwest::Url::parse(&format!("{}{path}", self.base_url)).map_err(|error| {
                AppError::other(format!("Invalid Riot Client URL for path={path}: {error}"))
            })?;
        if !query.is_empty() {
            url.query_pairs_mut().extend_pairs(query.iter());
        }

        let mut req = self
            .req_client
            .request(method, url)
            .timeout(self.network_config.request_timeout())
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json");

        if let Some(payload) = body.as_ref() {
            req = req.json(payload);
        }

        let resp = req
            .send()
            .await
            .map_err(|source| AppError::LcuRequest { source })?;
        let status = resp.status();
        let body_bytes = resp
            .bytes()
            .await
            .map_err(|source| AppError::LcuRequest { source })?;
        let body = parse_response_body(&body_bytes);

        Ok(RiotClientJsonResponse { status, body })
    }
}

fn riot_client_auth(auth: &LcuAuth) -> Result<(u16, &str), AppError> {
    let auth = match &auth.cmd_args {
        LeagueClientCmdArgs::Tencent(args) => args
            .riotclient_app_port
            .zip(args.riotclient_auth_token.as_deref()),
        LeagueClientCmdArgs::Riot(args) => args
            .riotclient_app_port
            .zip(args.riotclient_auth_token.as_deref()),
    };

    auth.ok_or_else(|| AppError::other("Riot Client authentication arguments are unavailable"))
}

fn parse_response_body(body_bytes: &[u8]) -> Value {
    if body_bytes.is_empty() {
        return JsonValue::Null;
    }

    serde_json::from_slice::<Value>(body_bytes)
        .unwrap_or_else(|_| JsonValue::String(String::from_utf8_lossy(body_bytes).into_owned()))
}

fn deserialize_json<T: DeserializeOwned>(value: Value) -> Result<T, AppError> {
    Ok(serde_path_to_error::deserialize(value)?)
}

fn response_body_preview(body: &Value) -> String {
    let raw = serde_json::to_string(body).unwrap_or_else(|_| body.to_string());
    let trimmed = raw.trim();
    if trimmed.len() <= 500 {
        return trimmed.to_string();
    }

    let mut preview = String::new();
    for (count, ch) in trimmed.chars().enumerate() {
        if count >= 500 {
            preview.push_str("...");
            return preview;
        }
        preview.push(ch);
    }
    preview
}
