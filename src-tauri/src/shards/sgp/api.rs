use std::time::Duration;

use reqwest::Client;
use serde_json::Value;

use super::config::{sgp_servers_config, SgpServerEndpoints};
use crate::error::AppError;
use crate::shards::lcu::manager::SgpTokenContext;

pub struct SgpApi {
    req_client: Client,
}

impl SgpApi {
    const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
    const USER_AGENT: &'static str = "LeagueOfLegendsClient/14.13.596.7996 (rcp-be-lol-match-history)";

    pub fn new() -> Result<Self, AppError> {
        let req_client = Client::builder()
            .timeout(Self::REQUEST_TIMEOUT)
            .user_agent(Self::USER_AGENT)
            .build()
            .map_err(|error| AppError::Other(format!("Failed to build SGP client: {error}")))?;

        Ok(Self { req_client })
    }

    pub async fn get_match_summaries(
        &self,
        token_context: &SgpTokenContext,
        puuid: &str,
        start_index: u32,
        count: u32,
        tag: Option<&str>,
    ) -> Result<Value, AppError> {
        let endpoint = self.resolve_server_endpoint(&token_context.sgp_server_id)?;
        let Some(base_url) = endpoint.match_history.as_deref() else {
            return Err(AppError::Other(format!(
                "matchHistory endpoint is not configured for server {}",
                token_context.sgp_server_id
            )));
        };

        let path = format!("/match-history-query/v1/products/lol/player/{puuid}/SUMMARY");
        let mut query = vec![
            ("startIndex", start_index.to_string()),
            ("count", count.to_string()),
        ];

        if let Some(tag) = tag {
            query.push(("tag", tag.to_string()));
        }

        self.request_json(
            base_url,
            &path,
            &token_context.access_token,
            Some(query),
        )
        .await
    }

    pub async fn get_game_summary(
        &self,
        token_context: &SgpTokenContext,
        game_id: u64,
    ) -> Result<Value, AppError> {
        let endpoint = self.resolve_server_endpoint(&token_context.sgp_server_id)?;
        let Some(base_url) = endpoint.match_history.as_deref() else {
            return Err(AppError::Other(format!(
                "matchHistory endpoint is not configured for server {}",
                token_context.sgp_server_id
            )));
        };

        let sub_id = sub_id_from_server_id(&token_context.sgp_server_id);
        let game_key = format!("{}_{}", sub_id.to_uppercase(), game_id);
        let path = format!("/match-history-query/v1/products/lol/{game_key}/SUMMARY");
        self.request_json(base_url, &path, &token_context.access_token, None)
            .await
    }

    fn resolve_server_endpoint(
        &self,
        sgp_server_id: &str,
    ) -> Result<SgpServerEndpoints, AppError> {
        let config = sgp_servers_config()?;
        let server_key = sgp_server_id.to_uppercase();
        config
            .servers
            .get(&server_key)
            .cloned()
            .ok_or_else(|| AppError::Other(format!("Unknown SGP server id: {sgp_server_id}")))
    }

    async fn request_json(
        &self,
        base_url: &str,
        path: &str,
        access_token: &str,
        query: Option<Vec<(&'static str, String)>>,
    ) -> Result<Value, AppError> {
        let request_url = if let Some(params) = query {
            let query = params
                .iter()
                .map(|(key, value)| format!("{key}={}", urlencoding::encode(value)))
                .collect::<Vec<_>>()
                .join("&");
            format!("{base_url}{path}?{query}")
        } else {
            format!("{base_url}{path}")
        };

        let req = self
            .req_client
            .get(request_url)
            .header("Authorization", format!("Bearer {access_token}"))
            .header("Accept", "application/json");

        let resp = req
            .send()
            .await
            .map_err(|error| AppError::Other(format!("SGP request failed: {error}")))?;

        let status = resp.status();
        if !status.is_success() {
            let body = resp.text().await.unwrap_or_else(|_| String::new());
            return Err(AppError::Other(format!(
                "SGP request failed with status {status}: {body}"
            )));
        }

        resp.json::<Value>()
            .await
            .map_err(|error| AppError::Other(format!("Failed to parse SGP response JSON: {error}")))
    }
}

fn sub_id_from_server_id(sgp_server_id: &str) -> String {
    if let Some(sub_id) = sgp_server_id.strip_prefix("TENCENT_") {
        return sub_id.to_string();
    }
    sgp_server_id.to_string()
}
