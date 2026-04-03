use std::sync::Arc;

use super::api::SgpApi;
use super::config::sgp_servers_config;
use super::http_client::SgpHttpClient;
use crate::error::AppError;
use crate::shards::lcu::http_client::LcuHttpClient;
use crate::shards::lcu::session::LcuSession;
use crate::shards::settings::SettingHandle;

#[derive(Debug, Clone)]
pub struct SgpTokenContext {
    pub access_token: String,
    pub league_session_token: String,
    pub sgp_server_id: String,
}

/// Fetches access token and league session token from LCU.
pub(crate) async fn fetch_lcu_tokens(client: &LcuHttpClient) -> Result<(String, String), AppError> {
    let entitlements = client.get("/entitlements/v1/token").await?;
    let access_token = entitlements
        .get("accessToken")
        .and_then(|value| value.as_str())
        .filter(|token| !token.is_empty())
        .map(ToString::to_string)
        .ok_or_else(|| AppError::other("LCU entitlements accessToken is missing"))?;

    let league_session_token = client
        .get("/lol-league-session/v1/league-session-token")
        .await?
        .as_str()
        .filter(|token| !token.is_empty())
        .map(ToString::to_string)
        .ok_or_else(|| AppError::other("LCU league session token is missing"))?;

    Ok((access_token, league_session_token))
}

pub struct SgpSession {
    api: SgpApi,
}

impl SgpSession {
    pub(crate) async fn new(
        lcu_session: &Arc<LcuSession>,
        request_timeout_setting: SettingHandle,
    ) -> Result<Self, AppError> {
        let token_context = exchange_token_context(lcu_session).await?;
        let http_client =
            SgpHttpClient::new(lcu_session.clone(), token_context, request_timeout_setting)?;
        let api = SgpApi::new(http_client);
        Ok(Self { api })
    }

    pub fn api(&self) -> &SgpApi {
        &self.api
    }
}

async fn exchange_token_context(
    lcu_session: &Arc<LcuSession>,
) -> Result<SgpTokenContext, AppError> {
    let client = lcu_session.api().require_http_client()?;

    let (access_token, league_session_token) = fetch_lcu_tokens(&client).await?;

    let locale_region = client
        .get("/riotclient/region-locale")
        .await
        .ok()
        .and_then(|value| {
            value
                .get("region")
                .and_then(|region| region.as_str())
                .map(ToString::to_string)
        });

    let auth = lcu_session.auth();
    let sgp_server_id = derive_sgp_server_id(
        auth.region.clone(),
        auth.rso_platform_id.clone(),
        locale_region,
    )?;

    Ok(SgpTokenContext {
        access_token,
        league_session_token,
        sgp_server_id,
    })
}

fn derive_sgp_server_id(
    auth_region: Option<String>,
    auth_rso_platform_id: Option<String>,
    locale_region: Option<String>,
) -> Result<String, AppError> {
    let normalized_region = auth_region
        .or(locale_region)
        .map(|region| region.trim().to_uppercase())
        .filter(|region| !region.is_empty());

    let normalized_rso_platform_id = auth_rso_platform_id
        .map(|platform| platform.trim().to_uppercase())
        .filter(|platform| !platform.is_empty());

    let Some(region) = normalized_region else {
        return Err(AppError::other(
            "Unable to derive SGP server id: missing LCU region context".to_string(),
        ));
    };

    if region == "TENCENT" {
        let Some(rso_platform_id) = normalized_rso_platform_id else {
            return Err(AppError::other(
                "Unable to derive SGP server id for Tencent: missing rso_platform_id".to_string(),
            ));
        };
        return Ok(format!("TENCENT_{rso_platform_id}"));
    }

    let candidate = normalized_rso_platform_id.unwrap_or(region);

    if let Ok(config) = sgp_servers_config() {
        if config.servers.contains_key(&candidate) {
            return Ok(candidate);
        }
        let matches: Vec<&String> = config
            .servers
            .keys()
            .filter(|k| !k.starts_with("TENCENT_") && k.starts_with(&candidate))
            .collect();
        if matches.len() == 1 {
            return Ok(matches[0].clone());
        }
    }

    Ok(candidate)
}
