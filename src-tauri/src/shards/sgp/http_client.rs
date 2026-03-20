use std::time::Duration;

use reqwest::Client;
use serde_json::Value;

use crate::error::AppError;

pub struct SgpHttpClient {
    req_client: Client,
}

impl SgpHttpClient {
    const REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
    const USER_AGENT: &'static str =
        "LeagueOfLegendsClient/14.13.596.7996 (rcp-be-lol-match-history)";

    pub fn new() -> Result<Self, AppError> {
        let req_client = Client::builder()
            .timeout(Self::REQUEST_TIMEOUT)
            .user_agent(Self::USER_AGENT)
            .build()
            .map_err(|error| AppError::Other(format!("Failed to build SGP client: {error}")))?;

        Ok(Self { req_client })
    }

    pub async fn request_json(
        &self,
        base_url: &str,
        path: &str,
        access_token: &str,
        query: Option<Vec<(&'static str, String)>>,
        body: Option<Value>,
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

        let mut req = self
            .req_client
            .request(
                if body.is_some() {
                    reqwest::Method::POST
                } else {
                    reqwest::Method::GET
                },
                request_url,
            )
            .header("Authorization", format!("Bearer {access_token}"))
            .header("Accept", "application/json");

        if let Some(payload) = body {
            req = req.json(&payload);
        }

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
