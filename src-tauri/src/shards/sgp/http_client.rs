use std::sync::Arc;

use reqwest::Client;
use serde_json::Value;
use std::time::Instant;
use tokio::sync::RwLock;

use crate::error::AppError;
use crate::shards::lcu::session::LcuSession;
use crate::shards::network::NetworkConfig;
use crate::utils::http_json::{
    headers_to_json, parse_json_or_string, pretty_json, redact_sensitive_json,
};

use super::session::SgpTokenContext;

fn format_error_sources(error: &dyn std::error::Error) -> String {
    let mut sources = Vec::new();
    let mut current = error.source();

    while let Some(source) = current {
        sources.push(source.to_string());
        current = source.source();
    }

    if sources.is_empty() {
        "none".to_string()
    } else {
        sources.join(" | ")
    }
}

#[derive(Clone, Copy)]
pub enum SgpTokenKind {
    Access,
    LeagueSession,
}

enum SgpResponse {
    Ok(Value),
    Unauthorized,
    Err(AppError),
}

fn debug_http_log(build: impl FnOnce() -> Value) {
    if !tracing::enabled!(tracing::Level::DEBUG) {
        return;
    }

    let mut log = build();
    redact_sensitive_json(&mut log);
    tracing::debug!(channel = "sgp-http", "[sgp-http] {}", pretty_json(&log));
}

fn request_log(
    method: &reqwest::Method,
    request_url: &str,
    access_token: &str,
    body: &Option<Value>,
) -> Value {
    let request_headers = serde_json::json!({
        "Authorization": format!("Bearer {access_token}"),
        "Accept": "application/json",
    });

    serde_json::json!({
        "method": method.as_str(),
        "url": request_url,
        "headers": request_headers,
        "body": body.clone().unwrap_or(Value::Null),
    })
}

fn response_headers_log(response_headers: &Option<Value>) -> Value {
    response_headers.clone().unwrap_or(Value::Null)
}

pub struct SgpHttpClient {
    req_client: Client,
    lcu_session: Arc<LcuSession>,
    network_config: Arc<NetworkConfig>,
    access_token: RwLock<String>,
    league_session_token: RwLock<String>,
    sgp_server_id: String,
}

impl SgpHttpClient {
    const USER_AGENT: &'static str =
        "LeagueOfLegendsClient/14.13.596.7996 (rcp-be-lol-match-history)";

    pub fn new(
        lcu_session: Arc<LcuSession>,
        initial_tokens: SgpTokenContext,
        network_config: Arc<NetworkConfig>,
    ) -> Result<Self, AppError> {
        let req_client = network_config
            .client_builder()
            .user_agent(Self::USER_AGENT)
            .build()
            .map_err(|error| AppError::other(format!("Failed to build SGP client: {error}")))?;

        Ok(Self {
            req_client,
            lcu_session,
            network_config,
            access_token: RwLock::new(initial_tokens.access_token),
            league_session_token: RwLock::new(initial_tokens.league_session_token),
            sgp_server_id: initial_tokens.sgp_server_id,
        })
    }

    pub fn sgp_server_id(&self) -> &str {
        &self.sgp_server_id
    }

    async fn get_token(&self, kind: SgpTokenKind) -> String {
        match kind {
            SgpTokenKind::Access => self.access_token.read().await.clone(),
            SgpTokenKind::LeagueSession => self.league_session_token.read().await.clone(),
        }
    }

    async fn refresh_tokens(&self) -> Result<(), AppError> {
        let client = self.lcu_session.api().require_http_client()?;
        let (new_access_token, new_league_session_token) =
            super::session::fetch_lcu_tokens(&client).await?;

        *self.access_token.write().await = new_access_token;
        *self.league_session_token.write().await = new_league_session_token;

        tracing::debug!(
            channel = "sgp-http",
            "[sgp-http] tokens refreshed after 401"
        );

        Ok(())
    }

    pub async fn request(
        &self,
        method: reqwest::Method,
        base_url: &str,
        path: &str,
        token_kind: SgpTokenKind,
        query: Option<Vec<(&'static str, String)>>,
        body: Option<Value>,
    ) -> Result<Value, AppError> {
        let request_url = if let Some(ref params) = query {
            let qs = params
                .iter()
                .map(|(key, value)| format!("{key}={}", urlencoding::encode(value)))
                .collect::<Vec<_>>()
                .join("&");
            format!("{base_url}{path}?{qs}")
        } else {
            format!("{base_url}{path}")
        };

        let token = self.get_token(token_kind).await;
        match self
            .send_request(&method, &request_url, &token, body.clone())
            .await
        {
            SgpResponse::Ok(json) => Ok(json),
            SgpResponse::Unauthorized => {
                tracing::debug!(
                    channel = "sgp-http",
                    "[sgp-http] got 401, attempting token refresh and retry"
                );
                if let Err(refresh_err) = self.refresh_tokens().await {
                    tracing::debug!(
                        channel = "sgp-http",
                        "[sgp-http] token refresh failed: {refresh_err}"
                    );
                    return Err(AppError::other(format!(
                        "SGP 401 Unauthorized and token refresh failed: {refresh_err}"
                    )));
                }
                let new_token = self.get_token(token_kind).await;
                match self
                    .send_request(&method, &request_url, &new_token, body)
                    .await
                {
                    SgpResponse::Ok(json) => Ok(json),
                    SgpResponse::Unauthorized => Err(AppError::other(
                        "SGP 401 Unauthorized after token refresh".to_string(),
                    )),
                    SgpResponse::Err(e) => Err(e),
                }
            }
            SgpResponse::Err(e) => Err(e),
        }
    }

    async fn send_request(
        &self,
        method: &reqwest::Method,
        request_url: &str,
        access_token: &str,
        body: Option<Value>,
    ) -> SgpResponse {
        let started = Instant::now();

        let mut req = self
            .req_client
            .request(method.clone(), request_url)
            .timeout(self.network_config.request_timeout())
            .header("Authorization", format!("Bearer {access_token}"))
            .header("Accept", "application/json");

        if let Some(payload) = body.as_ref() {
            req = req.json(payload);
        }

        let resp = match req.send().await {
            Ok(resp) => resp,
            Err(error) => {
                debug_http_log(|| {
                    serde_json::json!({
                        "channel": "sgp-http",
                        "kind": "http",
                        "request": request_log(method, request_url, access_token, &body),
                        "response": {
                            "status": Value::Null,
                            "statusText": Value::Null,
                            "durationMs": started.elapsed().as_millis(),
                            "httpVersion": Value::Null,
                            "headers": Value::Null,
                            "body": Value::Null,
                            "error": error.to_string(),
                        }
                    })
                });
                return SgpResponse::Err(AppError::other(format!("SGP request failed: {error}")));
            }
        };

        let status = resp.status();
        let http_version = format!("{:?}", resp.version());
        let response_headers = if tracing::enabled!(tracing::Level::DEBUG) {
            Some(headers_to_json(resp.headers()))
        } else {
            None
        };

        if status == reqwest::StatusCode::UNAUTHORIZED {
            let body_text = resp.text().await.unwrap_or_else(|_| String::new());
            debug_http_log(|| {
                serde_json::json!({
                    "channel": "sgp-http",
                    "kind": "http",
                    "request": request_log(method, request_url, access_token, &body),
                    "response": {
                        "status": status.as_u16(),
                        "statusText": status.to_string(),
                        "durationMs": started.elapsed().as_millis(),
                        "httpVersion": http_version,
                        "headers": response_headers_log(&response_headers),
                        "body": parse_json_or_string(&body_text),
                        "error": "401 Unauthorized",
                    }
                })
            });
            return SgpResponse::Unauthorized;
        }

        if !status.is_success() {
            let body_text = resp.text().await.unwrap_or_else(|_| String::new());
            let error_message = format!("HTTP {}", status.as_u16());
            debug_http_log(|| {
                serde_json::json!({
                    "channel": "sgp-http",
                    "kind": "http",
                    "request": request_log(method, request_url, access_token, &body),
                    "response": {
                        "status": status.as_u16(),
                        "statusText": status.to_string(),
                        "durationMs": started.elapsed().as_millis(),
                        "httpVersion": http_version,
                        "headers": response_headers_log(&response_headers),
                        "body": parse_json_or_string(&body_text),
                        "error": error_message,
                    }
                })
            });
            return SgpResponse::Err(AppError::other(format!(
                "SGP request failed with status {status}: {body_text}"
            )));
        }

        let body_bytes = match resp.bytes().await {
            Ok(bytes) => bytes,
            Err(error) => {
                let error_sources = format_error_sources(&error);
                debug_http_log(|| {
                    serde_json::json!({
                        "channel": "sgp-http",
                        "kind": "http",
                        "request": request_log(method, request_url, access_token, &body),
                        "response": {
                            "status": status.as_u16(),
                            "statusText": status.to_string(),
                            "durationMs": started.elapsed().as_millis(),
                            "httpVersion": http_version,
                            "headers": response_headers_log(&response_headers),
                            "body": Value::Null,
                            "error": format!(
                                "read body failed: {} (sources: {})",
                                error,
                                error_sources
                            ),
                        }
                    })
                });
                return SgpResponse::Err(AppError::other(format!(
                    "Failed to read SGP response body bytes: {error}"
                )));
            }
        };

        match serde_json::from_slice::<Value>(&body_bytes) {
            Ok(json) => {
                debug_http_log(|| {
                    serde_json::json!({
                        "channel": "sgp-http",
                        "kind": "http",
                        "request": request_log(method, request_url, access_token, &body),
                        "response": {
                            "status": status.as_u16(),
                            "statusText": status.to_string(),
                            "durationMs": started.elapsed().as_millis(),
                            "httpVersion": http_version,
                            "headers": response_headers_log(&response_headers),
                            "body": json.clone(),
                            "error": Value::Null,
                        }
                    })
                });
                SgpResponse::Ok(json)
            }
            Err(error) => {
                let body_text = String::from_utf8_lossy(&body_bytes);
                debug_http_log(|| {
                    serde_json::json!({
                        "channel": "sgp-http",
                        "kind": "http",
                        "request": request_log(method, request_url, access_token, &body),
                        "response": {
                            "status": status.as_u16(),
                            "statusText": status.to_string(),
                            "durationMs": started.elapsed().as_millis(),
                            "httpVersion": http_version,
                            "headers": response_headers_log(&response_headers),
                            "body": parse_json_or_string(body_text.as_ref()),
                            "error": format!("parse json failed: {}", error),
                        }
                    })
                });
                SgpResponse::Err(AppError::other(format!(
                    "Failed to parse SGP response JSON: {error}"
                )))
            }
        }
    }
}
