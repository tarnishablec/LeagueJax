use reqwest::header::{HeaderMap, HeaderValue};
use reqwest::{Method, StatusCode};
use serde_json::{Map, Value, Value as JsonValue};

use crate::utils::http_json::{parse_json_or_string, pretty_json};

pub const DEFAULT_HTTP_BODY_PREVIEW_BYTES: usize = 4096;
pub const MAX_HTTP_BODY_PREVIEW_BYTES: usize = 65536;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HttpBodyLogMode {
    #[cfg(debug_assertions)]
    Off,
    ErrorPreview,
    #[cfg(debug_assertions)]
    Full,
}

pub fn sanitize_preview_bytes(value: usize) -> usize {
    value.min(MAX_HTTP_BODY_PREVIEW_BYTES)
}

pub fn headers_to_log_json(headers: &HeaderMap) -> Value {
    let mut object = Map::new();

    for (name, value) in headers {
        insert_header_value(
            &mut object,
            name.as_str(),
            header_value_to_log_json(name.as_str(), value),
        );
    }

    Value::Object(object)
}

pub fn header_pairs_to_log_json(headers: &[(&str, &str)]) -> Value {
    let mut object = Map::new();

    for (name, value) in headers {
        let value = if is_sensitive_header_name(name) {
            JsonValue::from("<redacted>")
        } else {
            JsonValue::from(*value)
        };
        insert_header_value(&mut object, name, value);
    }

    Value::Object(object)
}

pub fn request_log(method: &Method, url: &str, headers: Value, body: Option<Value>) -> Value {
    serde_json::json!({
        "method": method.as_str(),
        "url": url,
        "headers": headers,
        "body": body.unwrap_or(JsonValue::Null),
    })
}

pub fn response_body_log(
    body_bytes: &[u8],
    mode: HttpBodyLogMode,
    is_error: bool,
    preview_bytes: usize,
) -> Value {
    match mode {
        #[cfg(debug_assertions)]
        HttpBodyLogMode::Off => JsonValue::Null,
        HttpBodyLogMode::ErrorPreview if is_error => body_preview_log(body_bytes, preview_bytes),
        HttpBodyLogMode::ErrorPreview => JsonValue::Null,
        #[cfg(debug_assertions)]
        HttpBodyLogMode::Full => raw_body_log(body_bytes),
    }
}

pub fn body_preview_log(body_bytes: &[u8], preview_bytes: usize) -> Value {
    let preview_len = body_bytes.len().min(sanitize_preview_bytes(preview_bytes));
    let preview_bytes = &body_bytes[..preview_len];
    let truncated = body_bytes.len() > preview_len;
    let body_text = String::from_utf8_lossy(preview_bytes);

    serde_json::json!({
        "bytes": body_bytes.len(),
        "previewBytes": preview_bytes.len(),
        "truncated": truncated,
        "preview": parse_json_or_string(body_text.as_ref()),
    })
}

pub fn http_response_log(
    status: Option<StatusCode>,
    duration_ms: u128,
    http_version: Option<&str>,
    headers: Value,
    body: Value,
    error: Value,
) -> Value {
    serde_json::json!({
        "status": status
            .map(|status| JsonValue::from(status.as_u16()))
            .unwrap_or(JsonValue::Null),
        "statusText": status
            .map(|status| JsonValue::from(status.to_string()))
            .unwrap_or(JsonValue::Null),
        "durationMs": duration_ms,
        "httpVersion": http_version
            .map(JsonValue::from)
            .unwrap_or(JsonValue::Null),
        "headers": headers,
        "body": body,
        "error": error,
    })
}

pub fn raw_http_response_log(
    mut response: Value,
    content_type: Option<&str>,
    body_encoding: Value,
) -> Value {
    if let Some(fields) = response.as_object_mut() {
        fields.insert(
            "contentType".to_string(),
            content_type.map(JsonValue::from).unwrap_or(JsonValue::Null),
        );
        fields.insert("bodyEncoding".to_string(), body_encoding);
    }
    response
}

pub fn log_http_exchange(channel: &str, request: Value, response: Value) {
    tracing::debug!(
        channel = %channel,
        "[{}] {}",
        channel,
        pretty_json(&serde_json::json!({
            "channel": channel,
            "kind": "http",
            "request": request,
            "response": response,
        }))
    );
}

pub fn log_http_success_summary(
    channel: &str,
    method: &Method,
    url: &str,
    status: StatusCode,
    duration_ms: u128,
    http_version: &str,
    body_bytes: usize,
) {
    tracing::debug!(
        channel = %channel,
        method = %method,
        url = %url,
        status = status.as_u16(),
        status_text = %status,
        duration_ms,
        http_version = %http_version,
        body_bytes,
        "HTTP request succeeded"
    );
}

#[cfg(debug_assertions)]
fn raw_body_log(body_bytes: &[u8]) -> Value {
    let body_text = String::from_utf8_lossy(body_bytes);
    parse_json_or_string(body_text.as_ref())
}

fn header_value_to_log_json(name: &str, value: &HeaderValue) -> Value {
    if is_sensitive_header_name(name) || value.is_sensitive() {
        return JsonValue::from("<redacted>");
    }

    JsonValue::from(value.to_str().unwrap_or("<non-utf8>"))
}

fn insert_header_value(object: &mut Map<String, Value>, name: &str, value: Value) {
    let key = name.to_ascii_lowercase();
    if let Some(existing) = object.get_mut(&key) {
        match existing {
            Value::Array(arr) => arr.push(value),
            _ => {
                let first = existing.take();
                *existing = Value::Array(vec![first, value]);
            }
        }
    } else {
        object.insert(key, value);
    }
}

fn is_sensitive_header_name(name: &str) -> bool {
    let normalized = name.trim().to_ascii_lowercase();
    matches!(
        normalized.as_str(),
        "authorization" | "proxy-authorization" | "cookie" | "set-cookie"
    ) || normalized.contains("token")
        || normalized.contains("secret")
        || normalized.contains("credential")
        || normalized.contains("jwt")
}

#[cfg(test)]
mod tests {
    use super::{
        body_preview_log, header_pairs_to_log_json, headers_to_log_json, response_body_log,
        HttpBodyLogMode,
    };
    use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION};
    use serde_json::{json, Value};

    #[test]
    fn header_pairs_redact_sensitive_headers() {
        let headers = header_pairs_to_log_json(&[
            ("Authorization", "Bearer token"),
            ("Content-Type", "application/json"),
            ("X-Riot-Entitlements-JWT", "jwt-value"),
        ]);

        assert_eq!(
            headers,
            json!({
                "authorization": "<redacted>",
                "content-type": "application/json",
                "x-riot-entitlements-jwt": "<redacted>",
            })
        );
    }

    #[test]
    fn header_map_redacts_sensitive_values_and_preserves_duplicates() {
        let mut headers = HeaderMap::new();
        headers.append(AUTHORIZATION, HeaderValue::from_static("Bearer token"));
        headers.append("x-repeat", HeaderValue::from_static("one"));
        headers.append("x-repeat", HeaderValue::from_static("two"));
        let mut sensitive = HeaderValue::from_static("hidden");
        sensitive.set_sensitive(true);
        headers.append(HeaderName::from_static("x-safe"), sensitive);

        assert_eq!(
            headers_to_log_json(&headers),
            json!({
                "authorization": "<redacted>",
                "x-repeat": ["one", "two"],
                "x-safe": "<redacted>",
            })
        );
    }

    #[test]
    fn body_preview_tracks_truncation() {
        let body = body_preview_log(b"{\"hello\":\"world\"}", 8);

        assert_eq!(
            body,
            json!({
                "bytes": 17,
                "previewBytes": 8,
                "truncated": true,
                "preview": "{\"hello\"",
            })
        );
    }

    #[test]
    fn success_body_is_not_logged_in_error_preview_mode() {
        let body = response_body_log(b"{\"ok\":true}", HttpBodyLogMode::ErrorPreview, false, 4096);

        assert_eq!(body, Value::Null);
    }
}
