use std::collections::{HashSet, VecDeque};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use crate::error::AppError;
use crate::shards::claim_tool::types::{
    event_has_unclaimed_rewards, event_hub_item, mission_item, resolve_event_hub_claim,
    resolve_mission_claim, resolve_reward_grant_claim, reward_grant_item, ClaimResolution,
    ClaimToolActivityEntryDto, ClaimToolActivityLevel, ClaimToolCategory, ClaimToolClaimRequestDto,
    ClaimToolClaimablesDto,
};
use crate::shards::lcu::api::LcuApi;
use crate::shards::lcu::concepts::claim::{
    LcuEventHubEvent, LcuEventHubRewardTrackItem, LcuMission, LcuRewardGrant,
};
use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::LcuShard;

use super::types::{ClaimToolRunResultDto, ClaimToolSnapshotDto, CLAIM_TOOL_RECENT_ACTIVITY_LIMIT};
use super::ClaimToolSettings;

#[derive(Default)]
struct ClaimToolState {
    is_running: bool,
    last_run_at_ms: Option<i64>,
    last_error: Option<String>,
    recent_activity: VecDeque<ClaimToolActivityEntryDto>,
}

#[derive(Default)]
struct ClaimCounters {
    claimed: u32,
    skipped: u32,
    failed: u32,
}

#[derive(Clone)]
pub struct ClaimToolManager {
    lcu_shard: Arc<LcuShard>,
    settings: ClaimToolSettings,
    state: Arc<Mutex<ClaimToolState>>,
    run_lock: Arc<tokio::sync::Mutex<()>>,
}

impl ClaimToolManager {
    pub(super) fn new(lcu_shard: Arc<LcuShard>, settings: ClaimToolSettings) -> Self {
        Self {
            lcu_shard,
            settings,
            state: Arc::new(Mutex::new(ClaimToolState::default())),
            run_lock: Arc::new(tokio::sync::Mutex::new(())),
        }
    }

    pub fn snapshot(&self) -> ClaimToolSnapshotDto {
        let state = self.state.lock().ok();
        ClaimToolSnapshotDto {
            claim_notification_enabled: self.settings.claim_notification_enabled(),
            is_running: state.as_ref().is_some_and(|state| state.is_running),
            last_run_at_ms: state.as_ref().and_then(|state| state.last_run_at_ms),
            last_error: state
                .as_ref()
                .and_then(|state| state.last_error.as_ref().cloned()),
            recent_activity: state
                .map(|state| state.recent_activity.iter().cloned().collect())
                .unwrap_or_default(),
        }
    }

    pub async fn get_claimables(&self) -> Result<ClaimToolClaimablesDto, AppError> {
        let session = self.focused_session().await?;
        let api = session.api();

        let rewards = api
            .get_reward_grants_by_status("PENDING_SELECTION")
            .await?
            .iter()
            .map(reward_grant_item)
            .collect();
        let missions = api
            .get_missions()
            .await?
            .iter()
            .filter(|mission| mission.status.eq_ignore_ascii_case("SELECT_REWARDS"))
            .map(mission_item)
            .collect();
        let event_hub = self.get_event_hub_items(api).await?;

        Ok(ClaimToolClaimablesDto {
            rewards,
            missions,
            event_hub,
            refreshed_at_ms: now_ms(),
        })
    }

    pub async fn has_focused_session(&self) -> bool {
        self.focused_session().await.is_ok()
    }

    pub async fn claim_all(&self) -> Result<ClaimToolRunResultDto, AppError> {
        self.claim_matching(None).await
    }

    pub async fn claim_request(
        &self,
        request: ClaimToolClaimRequestDto,
    ) -> Result<ClaimToolRunResultDto, AppError> {
        self.claim_matching(Some(request)).await
    }

    async fn claim_matching(
        &self,
        request: Option<ClaimToolClaimRequestDto>,
    ) -> Result<ClaimToolRunResultDto, AppError> {
        let _guard = self.run_lock.lock().await;
        self.set_running(true);

        let result = self.claim_matching_inner(request.as_ref()).await;
        self.set_running(false);

        match result {
            Ok(counters) => {
                self.update_last_run(None);
                Ok(ClaimToolRunResultDto {
                    snapshot: self.snapshot(),
                    claimed: counters.claimed,
                    skipped: counters.skipped,
                    failed: counters.failed,
                })
            }
            Err(error) => {
                let message = error.to_string();
                self.update_last_run(Some(message.clone()));
                self.record_activity(
                    ClaimToolActivityLevel::Error,
                    None,
                    "run",
                    format!("Claim run failed: {message}"),
                );
                Err(error)
            }
        }
    }

    async fn claim_matching_inner(
        &self,
        request: Option<&ClaimToolClaimRequestDto>,
    ) -> Result<ClaimCounters, AppError> {
        let session = self.focused_session().await?;
        let api = session.api();
        let mut counters = ClaimCounters::default();

        let rewards_filter = request.map(|request| id_set(&request.rewards));
        let missions_filter = request.map(|request| id_set(&request.missions));
        let events_filter = request.map(|request| id_set(&request.event_hub));

        let rewards = api.get_reward_grants_by_status("PENDING_SELECTION").await?;
        for grant in rewards {
            if !matches_filter(&rewards_filter, &grant.info.id) {
                continue;
            }
            self.claim_reward_grant(api, &grant, &mut counters).await;
        }

        let missions = api.get_missions().await?;
        for mission in missions {
            if !matches_filter(&missions_filter, &mission.id) {
                continue;
            }
            self.claim_mission(api, &mission, &mut counters).await;
        }

        let events = api.get_event_hub_events().await?;
        let mut event_claimed = false;
        for event in events {
            if !event_has_unclaimed_rewards(&event)
                || !matches_filter(&events_filter, &event.event_id)
            {
                continue;
            }
            let track_items = api
                .get_event_hub_reward_track_items(&event.event_id)
                .await?;
            let bonus_items = api.get_event_hub_bonus_items(&event.event_id).await?;
            if self
                .claim_event(api, &event, &track_items, &bonus_items, &mut counters)
                .await
            {
                event_claimed = true;
            }
        }

        if event_claimed {
            tokio::time::sleep(Duration::from_secs(2)).await;
        }

        Ok(counters)
    }

    async fn focused_session(&self) -> Result<Arc<LcuSession>, AppError> {
        let manager = self.lcu_shard.manager().ok_or(AppError::LcuNotConnected)?;
        manager
            .focused()
            .await
            .filter(|session| session.is_ready())
            .ok_or(AppError::LcuNotConnected)
    }

    async fn get_event_hub_items(
        &self,
        api: &LcuApi,
    ) -> Result<Vec<super::types::ClaimToolItemDto>, AppError> {
        let events = api.get_event_hub_events().await?;
        let mut items = Vec::new();

        for event in events
            .iter()
            .filter(|event| event_has_unclaimed_rewards(event))
        {
            let track_items = api
                .get_event_hub_reward_track_items(&event.event_id)
                .await?;
            let bonus_items = api.get_event_hub_bonus_items(&event.event_id).await?;
            items.push(event_hub_item(event, &track_items, &bonus_items));
        }

        Ok(items)
    }

    async fn claim_reward_grant(
        &self,
        api: &LcuApi,
        grant: &LcuRewardGrant,
        counters: &mut ClaimCounters,
    ) {
        let item = reward_grant_item(grant);
        match resolve_reward_grant_claim(grant) {
            ClaimResolution::Claimable(claim) => {
                match api
                    .select_reward_grant(&claim.grant_id, &claim.reward_group_id, &claim.selections)
                    .await
                {
                    Ok(()) => {
                        counters.claimed += 1;
                        self.record_activity(
                            ClaimToolActivityLevel::Info,
                            Some(ClaimToolCategory::Reward),
                            "claim",
                            format!("Claimed reward {}", item.title),
                        );
                        tracing::info!(
                            channel = "claim-tool",
                            category = "reward",
                            action = "claim",
                            grant_id = %claim.grant_id,
                            "Claimed reward grant"
                        );
                    }
                    Err(error) => {
                        counters.failed += 1;
                        self.record_claim_error(
                            ClaimToolCategory::Reward,
                            "claim",
                            &item.title,
                            &error,
                        );
                    }
                }
            }
            ClaimResolution::Skipped(reason) => {
                counters.skipped += 1;
                self.record_skip(ClaimToolCategory::Reward, &item.title, reason);
            }
        }
    }

    async fn claim_mission(
        &self,
        api: &LcuApi,
        mission: &LcuMission,
        counters: &mut ClaimCounters,
    ) {
        let item = mission_item(mission);
        match resolve_mission_claim(mission) {
            ClaimResolution::Claimable(claim) => {
                match api
                    .select_mission_reward_groups(&claim.mission_id, &claim.reward_groups)
                    .await
                {
                    Ok(()) => {
                        counters.claimed += 1;
                        self.record_activity(
                            ClaimToolActivityLevel::Info,
                            Some(ClaimToolCategory::Mission),
                            "claim",
                            format!("Claimed mission {}", item.title),
                        );
                        tracing::info!(
                            channel = "claim-tool",
                            category = "mission",
                            action = "claim",
                            mission_id = %claim.mission_id,
                            "Claimed mission reward"
                        );
                    }
                    Err(error) => {
                        counters.failed += 1;
                        self.record_claim_error(
                            ClaimToolCategory::Mission,
                            "claim",
                            &item.title,
                            &error,
                        );
                    }
                }
            }
            ClaimResolution::Skipped(reason) => {
                counters.skipped += 1;
                self.record_skip(ClaimToolCategory::Mission, &item.title, reason);
            }
        }
    }

    async fn claim_event(
        &self,
        api: &LcuApi,
        event: &LcuEventHubEvent,
        track_items: &[LcuEventHubRewardTrackItem],
        bonus_items: &[LcuEventHubRewardTrackItem],
        counters: &mut ClaimCounters,
    ) -> bool {
        let item = event_hub_item(event, track_items, bonus_items);
        match resolve_event_hub_claim(event, track_items, bonus_items) {
            ClaimResolution::Claimable(claim) => {
                match api.claim_event_hub_all(&claim.event_id).await {
                    Ok(()) => {
                        counters.claimed += 1;
                        self.record_activity(
                            ClaimToolActivityLevel::Info,
                            Some(ClaimToolCategory::EventHub),
                            "claim",
                            format!("Claimed event {}", item.title),
                        );
                        tracing::info!(
                            channel = "claim-tool",
                            category = "event-hub",
                            action = "claim",
                            event_id = %claim.event_id,
                            "Claimed event hub rewards"
                        );
                        true
                    }
                    Err(error) => {
                        counters.failed += 1;
                        self.record_claim_error(
                            ClaimToolCategory::EventHub,
                            "claim",
                            &item.title,
                            &error,
                        );
                        false
                    }
                }
            }
            ClaimResolution::Skipped(reason) => {
                counters.skipped += 1;
                self.record_skip(ClaimToolCategory::EventHub, &item.title, reason);
                false
            }
        }
    }

    fn set_running(&self, is_running: bool) {
        self.mutate_state(|state| {
            state.is_running = is_running;
        });
    }

    fn update_last_run(&self, error: Option<String>) {
        self.mutate_state(|state| {
            state.last_run_at_ms = Some(now_ms());
            state.last_error = error;
        });
    }

    fn record_skip(&self, category: ClaimToolCategory, title: &str, reason: String) {
        tracing::info!(
            channel = "claim-tool",
            category = ?category,
            action = "skip",
            reason = %reason,
            title = %title,
            "Skipped claim item"
        );
        self.record_activity(
            ClaimToolActivityLevel::Warning,
            Some(category),
            "skip",
            format!("Skipped {title}: {reason}"),
        );
    }

    fn record_claim_error(
        &self,
        category: ClaimToolCategory,
        action: &str,
        title: &str,
        error: &AppError,
    ) {
        tracing::warn!(
            channel = "claim-tool",
            category = ?category,
            action,
            title = %title,
            error = %error,
            "Claim item request failed"
        );
        self.record_activity(
            ClaimToolActivityLevel::Error,
            Some(category),
            action,
            format!("Failed {title}: {error}"),
        );
    }

    fn record_activity(
        &self,
        level: ClaimToolActivityLevel,
        category: Option<ClaimToolCategory>,
        action: &str,
        message: String,
    ) {
        self.mutate_state(|state| {
            state.recent_activity.push_front(ClaimToolActivityEntryDto {
                timestamp_ms: now_ms(),
                level,
                category,
                action: action.to_string(),
                message,
            });
            while state.recent_activity.len() > CLAIM_TOOL_RECENT_ACTIVITY_LIMIT {
                state.recent_activity.pop_back();
            }
        });
    }

    fn mutate_state(&self, f: impl FnOnce(&mut ClaimToolState)) {
        if let Ok(mut state) = self.state.lock() {
            f(&mut state);
        }
    }
}

fn id_set(ids: &[String]) -> HashSet<String> {
    ids.iter()
        .map(|id| id.trim())
        .filter(|id| !id.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn matches_filter(filter: &Option<HashSet<String>>, id: &str) -> bool {
    filter.as_ref().is_none_or(|ids| ids.contains(id))
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| i64::try_from(duration.as_millis()).unwrap_or(i64::MAX))
        .unwrap_or_default()
}
