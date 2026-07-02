use std::sync::Arc;

use jax::Jax;
use tauri::http::{header, Request, Response, StatusCode};
use tauri::Manager;

use super::LcuShard;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AssetPathError {
    BadRequest,
    ForbiddenDomain,
    ForbiddenPath,
}

impl AssetPathError {
    pub fn message(self) -> &'static str {
        match self {
            Self::BadRequest => "Invalid lcu:// request path",
            Self::ForbiddenDomain => "Only lcu://league-client/... is supported",
            Self::ForbiddenPath => "Only /lol-game-data/assets/* is allowed",
        }
    }
}

pub fn resolve_lcu_asset_path(
    authority: Option<&str>,
    raw_path: &str,
) -> Result<String, AssetPathError> {
    let domain = authority
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_default();
    if !domain.is_empty() && domain != "league-client" && domain != "localhost" {
        return Err(AssetPathError::ForbiddenDomain);
    }

    let normalized = raw_path.replace('\\', "/");
    if normalized.trim().is_empty() {
        return Err(AssetPathError::BadRequest);
    }

    let mut path = if normalized == "/league-client" {
        return Err(AssetPathError::BadRequest);
    } else if let Some(stripped) = normalized.strip_prefix("/league-client/") {
        format!("/{stripped}")
    } else {
        normalized
    };

    if !path.starts_with('/') {
        path = format!("/{path}");
    }

    let decoded = urlencoding::decode(&path).map_err(|_| AssetPathError::BadRequest)?;
    let decoded = collapse_slashes(decoded.as_ref());

    if decoded.contains("/../") || decoded.ends_with("/..") {
        return Err(AssetPathError::ForbiddenPath);
    }

    let is_allowed_asset =
        decoded == "/lol-game-data/assets" || decoded.starts_with("/lol-game-data/assets/");
    if !is_allowed_asset {
        return Err(AssetPathError::ForbiddenPath);
    }

    Ok(decoded)
}

fn collapse_slashes(path: &str) -> String {
    let mut collapsed = String::with_capacity(path.len());
    let mut previous_was_slash = false;

    for ch in path.chars() {
        if ch == '/' {
            if previous_was_slash {
                continue;
            }
            previous_was_slash = true;
            collapsed.push(ch);
        } else {
            previous_was_slash = false;
            collapsed.push(ch);
        }
    }

    collapsed
}

fn plain_response(status: StatusCode, body: &'static str) -> Response<Vec<u8>> {
    let builder = Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8");
    match builder.body(body.as_bytes().to_vec()) {
        Ok(response) => response,
        Err(_) => Response::new(body.as_bytes().to_vec()),
    }
}

fn bytes_response(
    status: StatusCode,
    content_type: Option<&str>,
    body: Vec<u8>,
) -> Response<Vec<u8>> {
    let mut builder = Response::builder().status(status);
    if let Some(content_type) = content_type {
        builder = builder.header(header::CONTENT_TYPE, content_type);
    }

    builder
        .body(body)
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

pub async fn handle_lcu_asset_request<R: tauri::Runtime>(
    app_handle: tauri::AppHandle<R>,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    let authority = request
        .uri()
        .authority()
        .map(|value| value.as_str())
        .map(|value| value.split(':').next().unwrap_or_default());
    let asset_path = match resolve_lcu_asset_path(authority, request.uri().path()) {
        Ok(path) => path,
        Err(error) => {
            return match error {
                AssetPathError::BadRequest => {
                    plain_response(StatusCode::BAD_REQUEST, error.message())
                }
                AssetPathError::ForbiddenDomain | AssetPathError::ForbiddenPath => {
                    plain_response(StatusCode::FORBIDDEN, error.message())
                }
            };
        }
    };

    let Some(jax_state) = app_handle.try_state::<Arc<Jax>>() else {
        return plain_response(StatusCode::SERVICE_UNAVAILABLE, "App state not ready");
    };
    let jax = Arc::clone(jax_state.inner());

    let Some(manager) = jax.get_shard::<LcuShard>().manager() else {
        return plain_response(
            StatusCode::SERVICE_UNAVAILABLE,
            "LCU manager not initialized",
        );
    };
    let lcu = manager
        .focused()
        .await
        .or_else(|| manager.any_ready_session());
    let Some(lcu) = lcu else {
        return plain_response(StatusCode::SERVICE_UNAVAILABLE, "No available LCU client");
    };

    let response = match lcu.api().get_asset_bytes(&asset_path).await {
        Ok(response) => response,
        Err(error) => {
            tracing::warn!("LCU asset proxy failed for {}: {}", asset_path, error);
            return plain_response(StatusCode::BAD_GATEWAY, "Failed to fetch LCU asset");
        }
    };

    let status = StatusCode::from_u16(response.status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
    bytes_response(status, response.content_type.as_deref(), response.body)
}

#[cfg(test)]
mod tests {
    use super::{resolve_lcu_asset_path, AssetPathError};

    #[test]
    fn resolves_league_client_asset_path() {
        let resolved = resolve_lcu_asset_path(
            Some("league-client"),
            "/lol-game-data/assets/v1/profile-icons/29.jpg",
        )
        .unwrap_or_default();
        assert_eq!(
            resolved,
            "/lol-game-data/assets/v1/profile-icons/29.jpg".to_string()
        );
    }

    #[test]
    fn resolves_prefixed_path() {
        let resolved = resolve_lcu_asset_path(
            None,
            "/league-client/lol-game-data/assets/v1/profile-icons/29.jpg",
        )
        .unwrap_or_default();
        assert_eq!(
            resolved,
            "/lol-game-data/assets/v1/profile-icons/29.jpg".to_string()
        );
    }

    #[test]
    fn rejects_foreign_domain() {
        let result = resolve_lcu_asset_path(Some("riot-client"), "/lol-game-data/assets/v1/a.png");
        assert_eq!(result, Err(AssetPathError::ForbiddenDomain));
    }

    #[test]
    fn rejects_non_asset_path() {
        let result =
            resolve_lcu_asset_path(Some("league-client"), "/lol-summoner/v1/current-summoner");
        assert_eq!(result, Err(AssetPathError::ForbiddenPath));
    }

    #[test]
    fn resolves_encoded_leading_slash_path() {
        let resolved = resolve_lcu_asset_path(
            Some("league-client"),
            "/%2Flol-game-data%2Fassets%2Fv1%2Fprofile-icons%2F29.jpg",
        )
        .unwrap_or_default();
        assert_eq!(
            resolved,
            "/lol-game-data/assets/v1/profile-icons/29.jpg".to_string()
        );
    }
}
