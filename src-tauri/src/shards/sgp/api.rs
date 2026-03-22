use super::config::{sgp_servers_config, SgpServerEndpoints};
use super::http_client::{SgpHttpClient, SgpTokenKind};
use crate::concepts::matches::{RawMatchSummariesResponse, RawMatchSummaryGame};
use crate::concepts::summoner::SummonerInfo;
use crate::error::AppError;

pub struct SgpApi {
    http_client: SgpHttpClient,
}

impl SgpApi {
    pub(crate) fn new(http_client: SgpHttpClient) -> Self {
        Self { http_client }
    }

    pub fn sgp_server_id(&self) -> &str {
        self.http_client.sgp_server_id()
    }

    fn resolve_server_endpoint(sgp_server_id: &str) -> Result<SgpServerEndpoints, AppError> {
        let config = sgp_servers_config()?;
        let server_key = sgp_server_id.to_uppercase();

        if let Some(endpoint) = config.servers.get(&server_key) {
            return Ok(endpoint.clone());
        }

        let matches: Vec<(&String, &SgpServerEndpoints)> = config
            .servers
            .iter()
            .filter(|(k, _)| !k.starts_with("TENCENT_") && k.starts_with(&server_key))
            .collect();
        if matches.len() == 1 {
            return Ok(matches[0].1.clone());
        }

        Err(AppError::other(format!(
            "Unknown SGP server id: {sgp_server_id}"
        )))
    }

    fn resolve_match_history_base_url(sgp_server_id: &str) -> Result<String, AppError> {
        let endpoint = Self::resolve_server_endpoint(sgp_server_id)?;
        endpoint.match_history.ok_or_else(|| {
            AppError::other(format!(
                "matchHistory endpoint is not configured for server {}",
                sgp_server_id
            ))
        })
    }

    fn resolve_common_base_url(sgp_server_id: &str) -> Result<String, AppError> {
        let endpoint = Self::resolve_server_endpoint(sgp_server_id)?;
        endpoint.common.ok_or_else(|| {
            AppError::other(format!(
                "common endpoint is not configured for server {}",
                sgp_server_id
            ))
        })
    }

    fn sub_id_from_server_id(sgp_server_id: &str) -> String {
        if let Some(sub_id) = sgp_server_id.strip_prefix("TENCENT_") {
            return sub_id.to_string();
        }
        sgp_server_id.to_string()
    }

    fn normalize_server_id(server_id: &str) -> String {
        server_id.trim().to_uppercase()
    }

    fn resolve_target_server_id(&self, requested: Option<&str>) -> String {
        requested
            .map(Self::normalize_server_id)
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| Self::normalize_server_id(self.http_client.sgp_server_id()))
    }

    pub async fn get_match_summaries(
        &self,
        puuid: &str,
        start_index: u32,
        count: u32,
        tag: Option<&str>,
        sgp_server_id: Option<&str>,
    ) -> Result<RawMatchSummariesResponse, AppError> {
        let target_server_id = self.resolve_target_server_id(sgp_server_id);

        let base_url = Self::resolve_match_history_base_url(&target_server_id)?;
        let path = format!("/match-history-query/v1/products/lol/player/{puuid}/SUMMARY");
        let mut query = vec![
            ("startIndex", start_index.to_string()),
            ("count", count.to_string()),
        ];
        if let Some(tag) = tag {
            query.push(("tag", tag.to_string()));
        }

        let response = self
            .http_client
            .request(
                reqwest::Method::GET,
                &base_url,
                &path,
                SgpTokenKind::Access,
                Some(query),
                None,
            )
            .await?;

        let response_raw = serde_json::to_string(&response)?;
        let mut deserializer = serde_json::Deserializer::from_str(&response_raw);
        serde_path_to_error::deserialize::<_, RawMatchSummariesResponse>(&mut deserializer).map_err(
            |error| {
                let path = error.path().to_string();
                let source = error.inner().to_string();
                AppError::other(format!(
                    "Failed to parse get_match_summaries at path {path}: {source}"
                ))
            },
        )
    }

    pub async fn get_match_summary(
        &self,
        game_id: u64,
        sgp_server_id: Option<&str>,
    ) -> Result<RawMatchSummaryGame, AppError> {
        let target_server_id = self.resolve_target_server_id(sgp_server_id);

        let base_url = Self::resolve_match_history_base_url(&target_server_id)?;
        let sub_id = Self::sub_id_from_server_id(&target_server_id);
        let game_key = format!("{}_{}", sub_id.to_uppercase(), game_id);
        let path = format!("/match-history-query/v1/products/lol/{game_key}/SUMMARY");

        let response = self
            .http_client
            .request(
                reqwest::Method::GET,
                &base_url,
                &path,
                SgpTokenKind::Access,
                None,
                None,
            )
            .await?;

        let response_raw = serde_json::to_string(&response)?;
        let mut deserializer = serde_json::Deserializer::from_str(&response_raw);
        serde_path_to_error::deserialize::<_, RawMatchSummaryGame>(&mut deserializer).map_err(
            |error| {
                let path = error.path().to_string();
                let source = error.inner().to_string();
                AppError::other(format!(
                    "Failed to parse get_match_summary at path {path}: {source}"
                ))
            },
        )
    }

    pub async fn get_summoner_by_puuid(
        &self,
        sgp_server_id: &str,
        puuid: &str,
    ) -> Result<Option<SummonerInfo>, AppError> {
        let target_server = Self::normalize_server_id(sgp_server_id);
        let base_url = Self::resolve_common_base_url(&target_server)?;
        let sub_id = Self::sub_id_from_server_id(&target_server).to_lowercase();
        let path = format!("/summoner-ledge/v1/regions/{sub_id}/summoners/puuids");

        let response = self
            .http_client
            .request(
                reqwest::Method::POST,
                &base_url,
                &path,
                SgpTokenKind::LeagueSession,
                None,
                Some(serde_json::json!([puuid])),
            )
            .await?;

        let entries: Vec<SummonerInfo> = serde_json::from_value(response).map_err(|error| {
            AppError::other(format!(
                "Failed to parse SGP response for get_summoner_by_puuid: {error}"
            ))
        })?;

        Ok(entries.into_iter().next())
    }
}
