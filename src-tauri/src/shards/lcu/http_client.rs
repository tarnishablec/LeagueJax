use reqwest::{Client, Method, StatusCode};
use serde_json::{Value, Value as JsonValue};
use std::time::Instant;

use super::auth::LcuAuth;
use super::tls::build_lcu_client_tls_config;
use crate::error::AppError;
use crate::shards::log::HttpLogPolicy;
use crate::shards::network::NetworkConfig;
use crate::utils::http_log::{
    header_pairs_to_log_json, headers_to_log_json, http_response_log, log_http_exchange,
    log_http_success_summary, raw_http_response_log,
};
use std::sync::Arc;

pub struct LcuRawResponse {
    pub status: StatusCode,
    pub content_type: Option<String>,
    pub body: Vec<u8>,
}

pub struct LcuJsonResponse {
    pub status: StatusCode,
    pub body: Value,
}

impl LcuJsonResponse {
    pub fn ensure_success(&self, method: &Method, path: &str) -> Result<(), AppError> {
        ensure_successful_response(method, path, self.status, &self.body)
    }

    pub fn body_preview(&self) -> String {
        response_body_preview(&self.body)
    }
}

pub struct LcuHttpClient {
    req_client: Client,
    base_url: String,
    auth_header: String,
    network_config: Arc<NetworkConfig>,
    http_log_policy: Arc<HttpLogPolicy>,
}

fn truncate_for_error(raw: &str, max_chars: usize) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return "<empty>".to_string();
    }

    let mut preview = String::new();
    for (count, ch) in trimmed.chars().enumerate() {
        if count >= max_chars {
            preview.push_str("...");
            return preview;
        }
        preview.push(ch);
    }

    preview
}

fn source_location(line: u32, column: u32) -> String {
    format!(
        "src-tauri\\{}:{}:{}",
        file!().replace('/', "\\"),
        line,
        column
    )
}

fn request_log(method: &Method, url: &str, auth_header: &str, body: &Option<Value>) -> Value {
    crate::utils::http_log::request_log(
        method,
        url,
        header_pairs_to_log_json(&[
            ("Authorization", auth_header),
            ("Content-Type", "application/json"),
            ("Accept", "application/json"),
        ]),
        body.clone(),
    )
}

fn raw_request_log(method: &Method, url: &str, auth_header: &str) -> Value {
    crate::utils::http_log::request_log(
        method,
        url,
        header_pairs_to_log_json(&[("Authorization", auth_header), ("Accept", "*/*")]),
        None,
    )
}

fn json_string_field<'a>(body: &'a Value, field: &str) -> Option<&'a str> {
    body.get(field).and_then(|value| value.as_str())
}

fn response_body_preview(body: &Value) -> String {
    let raw = serde_json::to_string(body).unwrap_or_else(|_| body.to_string());
    truncate_for_error(&raw, 500)
}

fn lcu_failure_message(method: &Method, path: &str, status: StatusCode, body: &Value) -> String {
    let error_code = json_string_field(body, "errorCode");
    let message = json_string_field(body, "message");
    let detail = match (error_code, message) {
        (Some(error_code), Some(message)) => format!(" ({error_code}): {message}"),
        (Some(error_code), None) => format!(" ({error_code})"),
        (None, Some(message)) => format!(": {message}"),
        (None, None) => format!(": {}", response_body_preview(body)),
    };

    format!(
        "LCU request failed: {} {} returned {}{}",
        method.as_str(),
        path,
        status,
        detail
    )
}

fn ensure_successful_response(
    method: &Method,
    path: &str,
    status: StatusCode,
    body: &Value,
) -> Result<(), AppError> {
    if status.is_success() {
        return Ok(());
    }

    let error_code = json_string_field(body, "errorCode").unwrap_or_default();
    let message = json_string_field(body, "message").unwrap_or_default();
    let body_preview = response_body_preview(body);
    tracing::error!(
        channel = "lcu-http",
        method = %method,
        path = %path,
        status = status.as_u16(),
        status_text = %status,
        error_code = %error_code,
        lcu_message = %message,
        body_preview = %body_preview,
        "LCU request returned unsuccessful status"
    );

    Err(AppError::other(lcu_failure_message(
        method, path, status, body,
    )))
}

impl LcuHttpClient {
    pub fn new(
        auth: LcuAuth,
        network_config: Arc<NetworkConfig>,
        http_log_policy: Arc<HttpLogPolicy>,
    ) -> Result<Self, AppError> {
        // LCU uses a self-signed certificate, use per-instance certificate pinning.
        let tls_config = build_lcu_client_tls_config(auth.pid);
        let req_client = Client::builder()
            .use_preconfigured_tls(tls_config)
            .build()
            .map_err(|source| AppError::LcuRequest { source })?;

        Ok(Self {
            req_client,
            base_url: format!("https://127.0.0.1:{}", auth.port),
            auth_header: auth.auth_header,
            network_config,
            http_log_policy,
        })
    }

    pub async fn request_with_ensure(
        &self,
        method: Method,
        path: &str,
        query: &[(&str, &str)],
        body: Option<Value>,
    ) -> Result<Value, AppError> {
        let response = self.request(method.clone(), path, query, body).await?;
        response.ensure_success(&method, path)?;
        Ok(response.body)
    }

    pub async fn request(
        &self,
        method: Method,
        path: &str,
        query: &[(&str, &str)],
        body: Option<Value>,
    ) -> Result<LcuJsonResponse, AppError> {
        let mut url =
            reqwest::Url::parse(&format!("{}{path}", self.base_url)).map_err(|error| {
                AppError::other(format!("Invalid LCU URL for path={path}: {error}"))
            })?;
        if !query.is_empty() {
            url.query_pairs_mut().extend_pairs(query.iter().copied());
        }
        let started = Instant::now();

        let mut req = self
            .req_client
            .request(method.clone(), url)
            .timeout(self.network_config.request_timeout())
            .header("Authorization", &self.auth_header)
            .header("Content-Type", "application/json")
            .header("Accept", "application/json");

        if let Some(payload) = body.as_ref() {
            req = req.json(payload);
        }

        let req = req
            .build()
            .map_err(|error| AppError::LcuRequest { source: error })?;
        let url = req.url().to_string();
        let request = request_log(&method, &url, &self.auth_header, &body);

        let resp = match self.req_client.execute(req).await {
            Ok(resp) => resp,
            Err(error) => {
                log_http_exchange(
                    "lcu-http",
                    request,
                    http_response_log(
                        None,
                        started.elapsed().as_millis(),
                        None,
                        JsonValue::Null,
                        JsonValue::Null,
                        JsonValue::from(error.to_string()),
                    ),
                );
                return Err(error.into());
            }
        };
        let status = resp.status();
        let http_version = format!("{:?}", resp.version());
        let response_headers = headers_to_log_json(resp.headers());
        let body_bytes = match resp.bytes().await {
            Ok(bytes) => bytes,
            Err(error) => {
                log_http_exchange(
                    "lcu-http",
                    request,
                    http_response_log(
                        Some(status),
                        started.elapsed().as_millis(),
                        Some(&http_version),
                        response_headers,
                        JsonValue::Null,
                        JsonValue::from(error.to_string()),
                    ),
                );
                return Err(error.into());
            }
        };

        if status == StatusCode::NO_CONTENT || body_bytes.is_empty() {
            let is_error = !status.is_success();
            if is_error {
                log_http_exchange(
                    "lcu-http",
                    request,
                    http_response_log(
                        Some(status),
                        started.elapsed().as_millis(),
                        Some(&http_version),
                        response_headers,
                        JsonValue::Null,
                        JsonValue::Null,
                    ),
                );
            } else {
                log_http_success_summary(
                    "lcu-http",
                    &method,
                    &url,
                    status,
                    started.elapsed().as_millis(),
                    &http_version,
                    body_bytes.len(),
                );
            }
            return Ok(LcuJsonResponse {
                status,
                body: JsonValue::Null,
            });
        }

        match serde_json::from_slice::<Value>(&body_bytes) {
            Ok(json) => {
                let is_error = !status.is_success();
                let body_log = self
                    .http_log_policy
                    .response_body_log(&body_bytes, is_error);
                if is_error || !body_log.is_null() {
                    log_http_exchange(
                        "lcu-http",
                        request,
                        http_response_log(
                            Some(status),
                            started.elapsed().as_millis(),
                            Some(&http_version),
                            response_headers,
                            body_log,
                            JsonValue::Null,
                        ),
                    );
                } else {
                    log_http_success_summary(
                        "lcu-http",
                        &method,
                        &url,
                        status,
                        started.elapsed().as_millis(),
                        &http_version,
                        body_bytes.len(),
                    );
                }
                Ok(LcuJsonResponse { status, body: json })
            }
            Err(error) => {
                let body_text = String::from_utf8_lossy(&body_bytes);
                let body_preview = truncate_for_error(body_text.as_ref(), 240);
                let body_log = self.http_log_policy.response_body_log(&body_bytes, true);
                log_http_exchange(
                    "lcu-http",
                    request,
                    http_response_log(
                        Some(status),
                        started.elapsed().as_millis(),
                        Some(&http_version),
                        response_headers,
                        body_log,
                        JsonValue::from(error.to_string()),
                    ),
                );
                Err(AppError::other(format!(
                    "{} LCU JSON parse failed for path={} url={} status={} body_bytes={} body_preview={} error={}",
                    source_location(line!(), column!()),
                    path,
                    url,
                    status.as_u16(),
                    body_bytes.len(),
                    body_preview,
                    error
                )))
            }
        }
    }

    pub async fn get(&self, path: &str) -> Result<Value, AppError> {
        self.request_with_ensure(Method::GET, path, &[], None).await
    }

    pub async fn get_response(&self, path: &str) -> Result<LcuJsonResponse, AppError> {
        self.request(Method::GET, path, &[], None).await
    }

    pub async fn get_bytes(&self, path: &str) -> Result<LcuRawResponse, AppError> {
        let url = format!("{}{path}", self.base_url);
        let started = Instant::now();
        let method = Method::GET;

        let req = self
            .req_client
            .request(method.clone(), &url)
            .timeout(self.network_config.request_timeout())
            .header("Authorization", &self.auth_header)
            .header("Accept", "*/*");
        let req = req
            .build()
            .map_err(|error| AppError::LcuRequest { source: error })?;
        let url = req.url().to_string();
        let request = raw_request_log(&method, &url, &self.auth_header);

        let response = match self.req_client.execute(req).await {
            Ok(response) => response,
            Err(error) => {
                log_http_exchange(
                    "lcu-http",
                    request,
                    raw_http_response_log(
                        http_response_log(
                            None,
                            started.elapsed().as_millis(),
                            None,
                            JsonValue::Null,
                            JsonValue::Null,
                            JsonValue::from(error.to_string()),
                        ),
                        None,
                        JsonValue::Null,
                    ),
                );
                return Err(error.into());
            }
        };
        let status = response.status();
        let http_version = format!("{:?}", response.version());
        let content_type = response
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .map(|value| value.to_string());
        let response_headers = headers_to_log_json(response.headers());
        let body_bytes = match response.bytes().await {
            Ok(bytes) => bytes,
            Err(error) => {
                log_http_exchange(
                    "lcu-http",
                    request,
                    raw_http_response_log(
                        http_response_log(
                            Some(status),
                            started.elapsed().as_millis(),
                            Some(&http_version),
                            response_headers,
                            JsonValue::Null,
                            JsonValue::from(error.to_string()),
                        ),
                        content_type.as_deref(),
                        JsonValue::Null,
                    ),
                );
                return Err(error.into());
            }
        };
        let body = body_bytes.to_vec();

        if status.is_success() {
            log_http_success_summary(
                "lcu-http",
                &method,
                &url,
                status,
                started.elapsed().as_millis(),
                &http_version,
                body.len(),
            );
        } else {
            log_http_exchange(
                "lcu-http",
                request,
                raw_http_response_log(
                    http_response_log(
                        Some(status),
                        started.elapsed().as_millis(),
                        Some(&http_version),
                        response_headers,
                        JsonValue::Null,
                        JsonValue::Null,
                    ),
                    content_type.as_deref(),
                    JsonValue::Null,
                ),
            );
        }

        Ok(LcuRawResponse {
            status,
            content_type,
            body,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{lcu_failure_message, LcuJsonResponse};
    use reqwest::{Method, StatusCode};
    use serde_json::json;

    #[test]
    fn lcu_failure_message_uses_error_code_and_message() {
        let body = json!({
            "errorCode": "RPC_ERROR",
            "httpStatus": 503,
            "message": "not connected to RC chat yet"
        });

        let message = lcu_failure_message(
            &Method::GET,
            "/lol-chat/v1/friends",
            StatusCode::SERVICE_UNAVAILABLE,
            &body,
        );

        assert_eq!(
            message,
            "LCU request failed: GET /lol-chat/v1/friends returned 503 Service Unavailable (RPC_ERROR): not connected to RC chat yet"
        );
    }

    #[test]
    fn ensure_success_rejects_unsuccessful_status() {
        let response = LcuJsonResponse {
            status: StatusCode::SERVICE_UNAVAILABLE,
            body: json!({
                "errorCode": "RPC_ERROR",
                "message": "not connected to RC chat yet"
            }),
        };

        let result = response.ensure_success(&Method::GET, "/lol-chat/v1/friends");
        let message = result
            .err()
            .map(|error| error.to_string())
            .unwrap_or_default();

        assert_eq!(
            message,
            "LCU request failed: GET /lol-chat/v1/friends returned 503 Service Unavailable (RPC_ERROR): not connected to RC chat yet"
        );
    }
}
