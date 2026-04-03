use std::sync::Arc;

use reqwest::Client;
use serde_json::Value;
use tokio::sync::RwLock;

use crate::error::AppError;
use crate::network_config::NetworkConfig;
use crate::shards::lcu::session::LcuSession;

use super::session::SgpTokenContext;

const MAX_ERROR_BODY_LOG_LEN: usize = 512;

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
        let req_client = Client::builder()
            .http1_only()
            .no_proxy()
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

    fn truncate_body_for_log(body: &str) -> String {
        if body.len() <= MAX_ERROR_BODY_LOG_LEN {
            return body.to_string();
        }

        format!("{}...<truncated>", &body[..MAX_ERROR_BODY_LOG_LEN],)
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

        tracing::debug!("[SGP] Tokens refreshed after 401");

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
                tracing::debug!("[SGP] Got 401, attempting token refresh and retry");
                if let Err(refresh_err) = self.refresh_tokens().await {
                    tracing::debug!("[SGP] Token refresh failed: {refresh_err}");
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
        let mut req = self
            .req_client
            .request(method.clone(), request_url)
            .timeout(self.network_config.request_timeout())
            .header("Authorization", format!("Bearer {access_token}"))
            .header("Accept", "application/json")
            .header("Accept-Encoding", "identity");

        if let Some(payload) = body.as_ref() {
            req = req.json(payload);
        }

        let resp = match req.send().await {
            Ok(resp) => resp,
            Err(error) => {
                return SgpResponse::Err(AppError::other(format!("SGP request failed: {error}")));
            }
        };

        let status = resp.status();
        let http_version = format!("{:?}", resp.version());

        if status == reqwest::StatusCode::UNAUTHORIZED {
            let body = resp.text().await.unwrap_or_else(|_| String::new());
            tracing::debug!("[SGP] {method} {request_url} -> {status}: {body}");
            return SgpResponse::Unauthorized;
        }

        if !status.is_success() {
            let body = resp.text().await.unwrap_or_else(|_| String::new());
            tracing::debug!("[SGP] {method} {request_url} -> {status}: {body}");
            return SgpResponse::Err(AppError::other(format!(
                "SGP request failed with status {status}: {body}"
            )));
        }

        let content_type = resp
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("")
            .to_string();
        let content_encoding = resp
            .headers()
            .get(reqwest::header::CONTENT_ENCODING)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("")
            .to_string();
        let content_length = resp
            .headers()
            .get(reqwest::header::CONTENT_LENGTH)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("")
            .to_string();
        let transfer_encoding = resp
            .headers()
            .get(reqwest::header::TRANSFER_ENCODING)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("")
            .to_string();

        let body_bytes = match resp.bytes().await {
            Ok(bytes) => bytes,
            Err(error) => {
                let error_sources = format_error_sources(&error);
                tracing::error!(
                    method = %method,
                    request_url = %request_url,
                    status = %status,
                    http_version = %http_version,
                    content_type = %content_type,
                    content_encoding = %content_encoding,
                    content_length = %content_length,
                    transfer_encoding = %transfer_encoding,
                    body_read_error = %error,
                    body_read_error_sources = %error_sources,
                    "Failed to read SGP response body bytes"
                );
                return SgpResponse::Err(AppError::other(format!(
                    "Failed to read SGP response body bytes: {error}"
                )));
            }
        };

        match serde_json::from_slice::<Value>(&body_bytes) {
            Ok(json) => {
                #[cfg(debug_assertions)]
                {
                    tracing::debug!(
                        "[SGP] {method} {request_url} -> {status} http_version={http_version}"
                    );
                }
                SgpResponse::Ok(json)
            }
            Err(error) => {
                let body_text = String::from_utf8_lossy(&body_bytes);
                tracing::error!(
                    method = %method,
                    request_url = %request_url,
                    status = %status,
                    http_version = %http_version,
                    content_type = %content_type,
                    parse_error = %error,
                    response_body = %Self::truncate_body_for_log(body_text.as_ref()),
                    "Failed to parse SGP response JSON"
                );
                SgpResponse::Err(AppError::other(format!(
                    "Failed to parse SGP response JSON: {error}"
                )))
            }
        }
    }
}
