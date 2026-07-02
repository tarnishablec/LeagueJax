use super::http_client::{LcuHttpClient, LcuRawResponse};
use crate::error::AppError;
use crate::shards::lcu::concepts::champ_select_session::ChampSelectSessionData;
use crate::shards::lcu::concepts::chat::{LcuChatFriend, LcuChatFriendGroup};
use crate::shards::lcu::concepts::cherry::CherryAugment;
use crate::shards::lcu::concepts::claim::{
    LcuEventHubEvent, LcuEventHubRewardTrackItem, LcuMission, LcuRewardGrant,
};
use crate::shards::lcu::concepts::gameflow_phase::Phase as GameflowPhase;
use crate::shards::lcu::concepts::gameflow_session::GameflowSessionData;
use crate::shards::lcu::concepts::maps::LcuMap;
use crate::shards::lcu::concepts::matchmaking_ready_check::MatchmakingReadyCheckData;
use crate::shards::lcu::concepts::matchmaking_search::MatchmakingSearchData;
use crate::shards::lcu::concepts::queues::LcuQueue;
use crate::shards::lcu::concepts::rank::{RankStats, RankedTierSummary};
use crate::shards::lcu::concepts::replays::{LcuReplayConfiguration, LcuReplayMetadata};
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::lcu::concepts::teambuilder_tbd_game::{
    TeambuilderTbdGameMessage, TeambuilderTbdGamePayload,
};

use super::endpoints::*;

use reqwest::{Method, StatusCode};
use serde::Deserialize;
use serde_json::Value;
use std::{
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tokio::time::{timeout_at, Instant};

const CHAMP_SELECT_DODGE_WORKERS: usize = 5;
const CHAMP_SELECT_DODGE_TIMEOUT: Duration = Duration::from_secs(5);
const CHAMP_SELECT_QUIT_V2_ARGS: &str = r#"["", "teambuilder-draft", "quitV2", ""]"#;

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuRegionLocale {
    pub region: String,
    pub locale: String,
}

fn has_local_champ_select_player(session: &ChampSelectSessionData) -> bool {
    let Ok(local_cell_id) = u64::try_from(session.local_player_cell_id) else {
        return false;
    };

    session
        .my_team
        .iter()
        .any(|member| member.cell_id == local_cell_id)
}

fn can_dodge_champ_select(session: &ChampSelectSessionData) -> bool {
    !session.is_spectating && has_local_champ_select_player(session)
}

#[derive(Debug, Clone)]
pub struct OngoingSessionSeed {
    pub gameflow_session: Option<GameflowSessionData>,
    pub matchmaking_search: Option<MatchmakingSearchData>,
    pub ready_check: Option<MatchmakingReadyCheckData>,
    pub champ_select_session: Option<ChampSelectSessionData>,
    /// Cached riot-messaging-service teambuilder TBD payload, fetched via
    /// `GET /riot-messaging-service/v1/message/teambuilder/v1/tbdGameDtoV1`.
    /// This is the only LCU source that exposes the real puuid / summoner id
    /// for hidden-name allies during ranked pre-reveal champ select, so we use
    /// it to backfill the cold-start roster and late InGame roster gaps.
    pub teambuilder_payload: Option<TeambuilderTbdGamePayload>,
}

pub struct LcuApi {
    http_client: Mutex<Option<Arc<LcuHttpClient>>>,
}

fn replay_path_from_value(value: Value) -> Option<String> {
    match value {
        Value::String(path) => normalize_replay_path(&path),
        Value::Object(map) => ["path", "replayPath", "replaysPath", "directory"]
            .into_iter()
            .find_map(|key| {
                map.get(key)
                    .and_then(Value::as_str)
                    .and_then(normalize_replay_path)
            }),
        _ => None,
    }
}

fn normalize_replay_path(path: &str) -> Option<String> {
    let trimmed = path.trim().trim_matches('"').trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(PathBuf::from(trimmed).to_string_lossy().to_string())
}

impl LcuApi {
    pub(crate) fn new() -> Self {
        Self {
            http_client: Mutex::new(None),
        }
    }

    pub(crate) fn set_http_client(&self, client: Arc<LcuHttpClient>) {
        if let Ok(mut current) = self.http_client.lock() {
            *current = Some(client);
        }
    }

    pub(crate) fn clear_http_client(&self) {
        if let Ok(mut current) = self.http_client.lock() {
            *current = None;
        }
    }

    pub(crate) fn http_client(&self) -> Option<Arc<LcuHttpClient>> {
        self.http_client
            .lock()
            .ok()
            .and_then(|current| current.as_ref().cloned())
    }

    pub(crate) fn require_http_client(&self) -> Result<Arc<LcuHttpClient>, AppError> {
        self.http_client().ok_or(AppError::LcuNotConnected)
    }

    pub async fn get_current_summoner(&self) -> Result<SummonerInfo, AppError> {
        let value = self
            .require_http_client()?
            .get("/lol-summoner/v1/current-summoner")
            .await?;
        Ok(serde_path_to_error::deserialize(value)?)
    }

    pub async fn get_summoner_by_puuid(&self, puuid: &str) -> Result<SummonerInfo, AppError> {
        let encoded_puuid = urlencoding::encode(puuid);
        let path = format!("/lol-summoner/v2/summoners/puuid/{encoded_puuid}");
        let value = self.require_http_client()?.get(&path).await?;
        Ok(serde_path_to_error::deserialize(value)?)
    }

    pub async fn get_summoner_by_puuid_optional(
        &self,
        puuid: &str,
    ) -> Result<Option<SummonerInfo>, AppError> {
        let encoded_puuid = urlencoding::encode(puuid);
        let path = format!("/lol-summoner/v2/summoners/puuid/{encoded_puuid}");
        let response = self.require_http_client()?.get_response(&path).await?;

        if response.status == StatusCode::NOT_FOUND {
            tracing::debug!(
                endpoint = %path,
                "LCU summoner by puuid not found; treat as missing"
            );
            return Ok(None);
        }

        response.ensure_success(&Method::GET, &path)?;

        Ok(Some(serde_path_to_error::deserialize(response.body)?))
    }

    // pub async fn get_summoner_by_id(&self, summoner_id: i64) -> Result<SummonerInfo, AppError> {
    //     let path = format!("/lol-summoner/v1/summoners/{summoner_id}");
    //     let value = self.require_http_client()?.get(&path).await?;
    //     Ok(serde_path_to_error::deserialize(value)?)
    // }

    #[allow(dead_code)]
    pub async fn get_chat_participants_summoner_ids(
        &self,
        conversation_id: &str,
    ) -> Result<Vec<i64>, AppError> {
        let encoded = urlencoding::encode(conversation_id);
        let path = format!("/lol-chat/v1/conversations/{encoded}/participants");
        let value = self.require_http_client()?.get(&path).await?;
        let arr: Vec<Value> = serde_path_to_error::deserialize(value)?;
        Ok(arr
            .iter()
            .filter_map(|v| v.get("summonerId").and_then(|s| s.as_i64()))
            .collect())
    }

    pub async fn get_ranked_stats(&self, puuid: &str) -> Result<RankStats, AppError> {
        let path = format!("/lol-ranked/v1/ranked-stats/{puuid}");
        let response = self.require_http_client()?.get(&path).await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn get_ranked_tiers(
        &self,
        summoner_ids: &[i64],
        queue_types: &[String],
    ) -> Result<Vec<RankedTierSummary>, AppError> {
        let summoner_ids_json = serde_json::to_string(summoner_ids)?;
        let queue_types_json = serde_json::to_string(queue_types)?;
        let query = format!(
            "summonerIds={}&queueTypes={}",
            urlencoding::encode(&summoner_ids_json),
            urlencoding::encode(&queue_types_json),
        );
        let path = format!("/lol-ranked/v2/tiers?{query}");
        let response = self.require_http_client()?.get(&path).await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn get_game_version(&self) -> Result<String, AppError> {
        let value = self
            .require_http_client()?
            .get("/lol-patch/v1/game-version")
            .await?;
        let full = value.as_str().unwrap_or_default();
        let version = full.split('.').take(2).collect::<Vec<_>>().join(".");
        Ok(version)
    }

    pub async fn get_region_locale(&self) -> Result<LcuRegionLocale, AppError> {
        let value = self
            .require_http_client()?
            .get("/riotclient/region-locale")
            .await?;
        Ok(serde_path_to_error::deserialize(value)?)
    }

    pub async fn get_cherry_augments_json(&self) -> Result<Vec<CherryAugment>, AppError> {
        let response = self
            .require_http_client()?
            .get("/lol-game-data/assets/v1/cherry-augments.json")
            .await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn get_queues_json(&self) -> Result<Vec<LcuQueue>, AppError> {
        let response = self
            .require_http_client()?
            .get("/lol-game-data/assets/v1/queues.json")
            .await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn get_maps_json(&self) -> Result<Vec<LcuMap>, AppError> {
        let response = self.require_http_client()?.get("/lol-maps/v2/maps").await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn get_asset_json(&self, path: &str) -> Result<Value, AppError> {
        self.require_http_client()?.get(path).await
    }

    pub async fn get_platform_config_namespaces(&self) -> Result<Value, AppError> {
        let response = self
            .require_http_client()?
            .get("/lol-platform-config/v1/namespaces")
            .await?;
        Ok(response)
    }

    pub async fn get_help(&self) -> Result<Value, AppError> {
        let response = self.require_http_client()?.get("/help").await?;
        Ok(response)
    }

    pub async fn get_replay_configuration(&self) -> Result<LcuReplayConfiguration, AppError> {
        let response = self
            .require_http_client()?
            .get(URI_REPLAYS_CONFIGURATION)
            .await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn get_replay_path(&self) -> Result<Option<String>, AppError> {
        let response = self
            .require_http_client()?
            .get(URI_REPLAYS_ROFLS_PATH)
            .await?;
        Ok(replay_path_from_value(response))
    }

    pub async fn get_default_replay_path(&self) -> Result<Option<String>, AppError> {
        let response = self
            .require_http_client()?
            .get(URI_REPLAYS_ROFLS_PATH_DEFAULT)
            .await?;
        Ok(replay_path_from_value(response))
    }

    pub async fn get_replay_metadata(&self, game_id: u64) -> Result<LcuReplayMetadata, AppError> {
        let path = format!("/lol-replays/v1/metadata/{game_id}");
        let response = self.require_http_client()?.get(&path).await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn create_replay_metadata(
        &self,
        game_id: u64,
        game_version: Option<&str>,
        game_type: Option<&str>,
        queue_id: Option<i64>,
        game_end: Option<i64>,
    ) -> Result<(), AppError> {
        let path = format!("/lol-replays/v2/metadata/{game_id}/create");
        let body = serde_json::json!({
            "gameVersion": game_version,
            "gameType": game_type,
            "queueId": queue_id,
            "gameEnd": game_end,
        });
        let response = self
            .require_http_client()?
            .request(Method::POST, &path, &[], Some(body))
            .await?;
        response.ensure_success(&Method::POST, &path)
    }

    pub async fn download_replay(&self, game_id: u64) -> Result<(), AppError> {
        let path = format!("/lol-replays/v1/rofls/{game_id}/download");
        let body = serde_json::json!({
            "componentType": "replay-button_match-history",
        });
        let response = self
            .require_http_client()?
            .request(Method::POST, &path, &[], Some(body))
            .await?;
        response.ensure_success(&Method::POST, &path)
    }

    pub async fn watch_replay(&self, game_id: u64) -> Result<(), AppError> {
        let path = format!("/lol-replays/v1/rofls/{game_id}/watch");
        let body = serde_json::json!({
            "componentType": "replay-button_match-history",
        });
        let response = self
            .require_http_client()?
            .request(Method::POST, &path, &[], Some(body))
            .await?;
        response.ensure_success(&Method::POST, &path)
    }

    pub async fn get_chat_friends(&self) -> Result<Vec<LcuChatFriend>, AppError> {
        let response = self
            .require_http_client()?
            .get(URI_LOL_CHAT_FRIENDS)
            .await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn get_chat_friend_groups(&self) -> Result<Vec<LcuChatFriendGroup>, AppError> {
        let response = self
            .require_http_client()?
            .get(URI_LOL_CHAT_FRIEND_GROUPS)
            .await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    /// Fetch the cached riot-messaging-service teambuilder TBD message via
    /// `GET /riot-messaging-service/v1/message/teambuilder/v1/tbdGameDtoV1`.
    ///
    /// RMS messages are normally only delivered as WS push events, but the
    /// riot-messaging-service plugin also exposes a GET endpoint that returns
    /// the most recently cached payload for a given resource path.  We use
    /// this on cold start during champ-select to recover the TBD payload that
    /// the WS stream already missed — it is the only LCU source that holds
    /// the real puuid / summoner id for hidden-name ranked pre-reveal allies.
    ///
    /// Returns `Ok(None)` when no message has been cached yet (404 / empty).
    pub async fn get_teambuilder_tbd_game_message(
        &self,
    ) -> Result<Option<TeambuilderTbdGameMessage>, AppError> {
        let response = self
            .require_http_client()?
            .get_response(URI_RMS_TEAMBUILDER_TBD_GAME)
            .await?;

        if response.status == StatusCode::NOT_FOUND {
            return Ok(None);
        }

        response.ensure_success(&Method::GET, URI_RMS_TEAMBUILDER_TBD_GAME)?;

        let body = response.body;
        if body.is_null() {
            return Ok(None);
        }

        // This endpoint is used as availability probing in some clients.
        // Treat RMS RPC errors like "Invalid function" as "no cached message".
        if let Some(error_code) = body.get("errorCode").and_then(|value| value.as_str()) {
            let message = body
                .get("message")
                .and_then(|value| value.as_str())
                .unwrap_or_default();
            tracing::info!(
                error_code = %error_code,
                message = %message,
                "LCU teambuilder TBD message unavailable; treat as empty"
            );
            return Ok(None);
        }

        Ok(Some(serde_path_to_error::deserialize(body)?))
    }

    pub async fn get_gameflow_session_typed_optional(
        &self,
    ) -> Result<Option<GameflowSessionData>, AppError> {
        let response = self
            .require_http_client()?
            .get_response(URI_GAMEFLOW_SESSION)
            .await?;

        if response.status == StatusCode::NOT_FOUND {
            return Ok(None);
        }

        response.ensure_success(&Method::GET, URI_GAMEFLOW_SESSION)?;

        Ok(Some(serde_path_to_error::deserialize(response.body)?))
    }

    pub async fn get_gameflow_phase(&self) -> Result<String, AppError> {
        let value = self.require_http_client()?.get(URI_GAMEFLOW_PHASE).await?;
        value
            .as_str()
            .map(|s| s.to_owned())
            .ok_or_else(|| AppError::other("gameflow phase is not a string"))
    }

    pub async fn get_gameflow_phase_typed(&self) -> Result<GameflowPhase, AppError> {
        let phase = self.get_gameflow_phase().await?;
        Ok(serde_path_to_error::deserialize(Value::String(phase))?)
    }

    pub async fn get_matchmaking_search_typed_optional(
        &self,
    ) -> Result<Option<MatchmakingSearchData>, AppError> {
        let response = self
            .require_http_client()?
            .get_response(URI_MATCHMAKING_SEARCH)
            .await?;

        if response.status == StatusCode::NOT_FOUND {
            return Ok(None);
        }

        response.ensure_success(&Method::GET, URI_MATCHMAKING_SEARCH)?;

        if !response.body.is_object() {
            return Ok(None);
        }

        Ok(Some(serde_path_to_error::deserialize(response.body)?))
    }

    pub async fn get_ready_check_typed_optional(
        &self,
    ) -> Result<Option<MatchmakingReadyCheckData>, AppError> {
        let response = self
            .require_http_client()?
            .get_response(URI_MATCHMAKING_READY_CHECK)
            .await?;

        if response.status == StatusCode::NOT_FOUND {
            return Ok(None);
        }

        response.ensure_success(&Method::GET, URI_MATCHMAKING_READY_CHECK)?;

        Ok(Some(serde_path_to_error::deserialize(response.body)?))
    }

    pub async fn accept_ready_check(&self) -> Result<(), AppError> {
        let response = self
            .require_http_client()?
            .request(Method::POST, URI_MATCHMAKING_READY_CHECK_ACCEPT, &[], None)
            .await?;

        if response.status.is_success() {
            return Ok(());
        }

        response.ensure_success(&Method::POST, URI_MATCHMAKING_READY_CHECK_ACCEPT)
    }

    pub async fn get_reward_grants_by_status(
        &self,
        status: &str,
    ) -> Result<Vec<LcuRewardGrant>, AppError> {
        let response = self
            .require_http_client()?
            .request(Method::GET, URI_REWARD_GRANTS, &[("status", status)], None)
            .await?;
        response.ensure_success(&Method::GET, URI_REWARD_GRANTS)?;
        Ok(serde_path_to_error::deserialize(response.body)?)
    }

    pub async fn select_reward_grant(
        &self,
        grant_id: &str,
        reward_group_id: &str,
        selections: &[String],
    ) -> Result<(), AppError> {
        let encoded_grant_id = urlencoding::encode(grant_id);
        let path = format!("{URI_REWARD_GRANTS}/{encoded_grant_id}/select");
        let body = serde_json::json!({
            "grantId": grant_id,
            "rewardGroupId": reward_group_id,
            "selections": selections,
        });
        let response = self
            .require_http_client()?
            .request(Method::POST, &path, &[], Some(body))
            .await?;
        response.ensure_success(&Method::POST, &path)
    }

    pub async fn get_missions(&self) -> Result<Vec<LcuMission>, AppError> {
        let response = self.require_http_client()?.get(URI_MISSIONS).await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn select_mission_reward_groups(
        &self,
        mission_id: &str,
        reward_groups: &[String],
    ) -> Result<(), AppError> {
        let encoded_mission_id = urlencoding::encode(mission_id);
        let path = format!("/lol-missions/v1/player/{encoded_mission_id}");
        let body = serde_json::json!({
            "rewardGroups": reward_groups,
        });
        let response = self
            .require_http_client()?
            .request(Method::PUT, &path, &[], Some(body))
            .await?;
        response.ensure_success(&Method::PUT, &path)
    }

    pub async fn get_event_hub_events(&self) -> Result<Vec<LcuEventHubEvent>, AppError> {
        let response = self
            .require_http_client()?
            .get(URI_EVENT_HUB_EVENTS)
            .await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn get_event_hub_reward_track_items(
        &self,
        event_id: &str,
    ) -> Result<Vec<LcuEventHubRewardTrackItem>, AppError> {
        let encoded_event_id = urlencoding::encode(event_id);
        let path = format!("/lol-event-hub/v1/events/{encoded_event_id}/reward-track/items");
        let response = self.require_http_client()?.get(&path).await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn get_event_hub_bonus_items(
        &self,
        event_id: &str,
    ) -> Result<Vec<LcuEventHubRewardTrackItem>, AppError> {
        let encoded_event_id = urlencoding::encode(event_id);
        let path = format!("/lol-event-hub/v1/events/{encoded_event_id}/reward-track/bonus-items");
        let response = self.require_http_client()?.get(&path).await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    pub async fn claim_event_hub_all(&self, event_id: &str) -> Result<(), AppError> {
        let encoded_event_id = urlencoding::encode(event_id);
        let path = format!("/lol-event-hub/v1/events/{encoded_event_id}/reward-track/claim-all");
        let response = self
            .require_http_client()?
            .request(Method::POST, &path, &[], None)
            .await?;
        response.ensure_success(&Method::POST, &path)
    }

    pub async fn kill_and_restart_ux(&self) -> Result<(), AppError> {
        tracing::info!(
            channel = "lcu-process",
            endpoint = %URI_RIOTCLIENT_KILL_AND_RESTART_UX,
            "LCU kill-and-restart UX request started"
        );
        let response = self
            .require_http_client()?
            .request(Method::POST, URI_RIOTCLIENT_KILL_AND_RESTART_UX, &[], None)
            .await?;
        tracing::info!(
            channel = "lcu-process",
            endpoint = %URI_RIOTCLIENT_KILL_AND_RESTART_UX,
            status = response.status.as_u16(),
            body_preview = %response.body_preview(),
            "LCU kill-and-restart UX request returned"
        );

        response.ensure_success(&Method::POST, URI_RIOTCLIENT_KILL_AND_RESTART_UX)
    }

    pub async fn dodge_champ_select(&self) -> Result<(), AppError> {
        let http_client = self.require_http_client()?;
        let initial_session = http_client.get_response(URI_CHAMP_SELECT_SESSION).await?;
        if initial_session.status == StatusCode::NOT_FOUND {
            return Ok(());
        }
        initial_session.ensure_success(&Method::GET, URI_CHAMP_SELECT_SESSION)?;
        let session: ChampSelectSessionData =
            serde_path_to_error::deserialize(initial_session.body.clone())?;
        if !can_dodge_champ_select(&session) {
            tracing::info!(
                channel = "lcu-champ-select",
                is_spectating = session.is_spectating,
                local_player_cell_id = session.local_player_cell_id,
                my_team_size = session.my_team.len(),
                "LCU champ select dodge rejected for non-player session"
            );
            return Err(AppError::other(
                "Cannot dodge champion select while spectating or without a local player slot",
            ));
        }

        tracing::info!(
            channel = "lcu-champ-select",
            endpoint = %URI_LOGIN_SESSION_INVOKE,
            workers = CHAMP_SELECT_DODGE_WORKERS,
            timeout_ms = CHAMP_SELECT_DODGE_TIMEOUT.as_millis(),
            "LCU champ select dodge loop started"
        );

        let done = Arc::new(AtomicBool::new(false));
        let deadline = Instant::now() + CHAMP_SELECT_DODGE_TIMEOUT;
        let workers = (0..CHAMP_SELECT_DODGE_WORKERS).map(|worker_id| {
            let http_client = Arc::clone(&http_client);
            let done = Arc::clone(&done);

            async move {
                let mut attempts = 0usize;
                let mut last_error = None::<String>;
                let query = [
                    ("destination", "lcdsServiceProxy"),
                    ("method", "call"),
                    ("args", CHAMP_SELECT_QUIT_V2_ARGS),
                ];

                while !done.load(Ordering::Relaxed) && Instant::now() < deadline {
                    attempts += 1;
                    let body = serde_json::json!({
                        "data": ["", "teambuilder-draft", "quitV2", ""]
                    });
                    match timeout_at(
                        deadline,
                        http_client.request(
                            Method::POST,
                            URI_LOGIN_SESSION_INVOKE,
                            &query,
                            Some(body),
                        ),
                    )
                    .await
                    {
                        Ok(Ok(response)) => {
                            if !response.status.is_success() {
                                last_error = Some(format!(
                                    "worker={worker_id} status={} body={}",
                                    response.status,
                                    response.body_preview()
                                ));
                            }
                        }
                        Ok(Err(error)) => {
                            last_error = Some(format!("worker={worker_id} request_error={error}"));
                        }
                        Err(_) => {
                            last_error = Some(format!("worker={worker_id} request_timeout"));
                            break;
                        }
                    }

                    match timeout_at(deadline, http_client.get_response(URI_CHAMP_SELECT_SESSION))
                        .await
                    {
                        Ok(Ok(response)) if response.status == StatusCode::NOT_FOUND => {
                            done.store(true, Ordering::Relaxed);
                            break;
                        }
                        Ok(Ok(response)) if response.status.is_success() => {}
                        Ok(Ok(response)) => {
                            last_error = Some(format!(
                                "worker={worker_id} session_status={} body={}",
                                response.status,
                                response.body_preview()
                            ));
                        }
                        Ok(Err(error)) => {
                            last_error = Some(format!("worker={worker_id} session_error={error}"));
                        }
                        Err(_) => {
                            last_error = Some(format!("worker={worker_id} session_timeout"));
                            break;
                        }
                    }
                }

                (attempts, last_error)
            }
        });
        let worker_results = futures_util::future::join_all(workers).await;
        let attempts = worker_results
            .iter()
            .map(|(attempts, _)| *attempts)
            .sum::<usize>();

        tracing::info!(
            channel = "lcu-champ-select",
            endpoint = %URI_LOGIN_SESSION_INVOKE,
            attempts,
            dodged = done.load(Ordering::Relaxed),
            "LCU champ select dodge loop finished"
        );

        if done.load(Ordering::Relaxed) {
            return Ok(());
        }

        let last_error = worker_results
            .iter()
            .rev()
            .find_map(|(_, error)| error.as_deref())
            .unwrap_or("none");

        Err(AppError::other(format!(
            "LCU champ select dodge timed out after {}ms attempts={} last_error={}",
            CHAMP_SELECT_DODGE_TIMEOUT.as_millis(),
            attempts,
            last_error
        )))
    }

    pub async fn swap_bench_champion(&self, champion_id: u64) -> Result<(), AppError> {
        let path = format!("{URI_CHAMP_SELECT_SESSION_BENCH_SWAP_PREFIX}/{champion_id}");
        let response = self
            .require_http_client()?
            .request(Method::POST, &path, &[], None)
            .await?;

        response.ensure_success(&Method::POST, &path)
    }

    pub async fn get_pickable_champion_ids(&self) -> Result<Vec<u64>, AppError> {
        let response = self
            .require_http_client()?
            .get(URI_CHAMP_SELECT_PICKABLE_CHAMPION_IDS)
            .await?;
        Ok(serde_path_to_error::deserialize(response)?)
    }

    /// Fetch the current champ-select session via
    /// `GET /lol-champ-select/v1/session`.
    ///
    /// LCU returns 404 when the client isn't in champ select, which we map to
    /// `Ok(None)` so callers can treat "not yet in / already left champ select"
    /// as a normal state instead of a hard error.  Used at cold-start / focus seeding,
    /// so we don't have to wait for the WS push to arrive.
    pub async fn get_champ_select_session_typed(
        &self,
    ) -> Result<Option<ChampSelectSessionData>, AppError> {
        let response = self
            .require_http_client()?
            .get_response(URI_CHAMP_SELECT_SESSION)
            .await?;

        if response.status == StatusCode::NOT_FOUND {
            return Ok(None);
        }

        response.ensure_success(&Method::GET, URI_CHAMP_SELECT_SESSION)?;

        Ok(Some(serde_path_to_error::deserialize(response.body)?))
    }

    #[allow(dead_code)]
    pub async fn get_champion_mastery_by_puuid(&self, puuid: &str) -> Result<Value, AppError> {
        let encoded = urlencoding::encode(puuid);
        let path = format!("/lol-champion-mastery/v1/champion-masteries-by-puuid/{encoded}");
        let response = self.require_http_client()?.get(&path).await?;
        Ok(response)
    }
    pub async fn get_asset_bytes(&self, path: &str) -> Result<LcuRawResponse, AppError> {
        self.require_http_client()?.get_bytes(path).await
    }
}
