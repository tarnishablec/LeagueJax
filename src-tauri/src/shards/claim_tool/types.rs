use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shards::lcu::concepts::claim::{
    LcuEventHubEvent, LcuEventHubRewardOption, LcuEventHubRewardTrackItem, LcuMission,
    LcuMissionReward, LcuRewardGrant,
};

pub const CLAIM_TOOL_AUTO_CLAIM_SETTING_ID: &str = "tools.claimTool.autoClaimEnabled";
pub const CLAIM_TOOL_AUTO_CLAIM_DEFAULT: bool = false;
pub const CLAIM_TOOL_AUTO_SCAN_INTERVAL_SECONDS: u64 = 15;
pub const CLAIM_TOOL_RECENT_ACTIVITY_LIMIT: usize = 40;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub enum ClaimToolCategory {
    Reward,
    Mission,
    EventHub,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub enum ClaimToolItemStatus {
    Claimable,
    Skipped,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub enum ClaimToolActivityLevel {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub struct ClaimToolRewardPreviewDto {
    pub id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub icon_url: Option<String>,
    pub quantity: Option<u64>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub struct ClaimToolItemDto {
    pub id: String,
    pub category: ClaimToolCategory,
    pub title: String,
    pub subtitle: Option<String>,
    pub icon_url: Option<String>,
    pub quantity: Option<u64>,
    pub choice_count: u32,
    pub status: ClaimToolItemStatus,
    pub reason: Option<String>,
    pub children: Vec<ClaimToolRewardPreviewDto>,
}

#[derive(Debug, Clone, Default, Serialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub struct ClaimToolClaimablesDto {
    pub rewards: Vec<ClaimToolItemDto>,
    pub missions: Vec<ClaimToolItemDto>,
    pub event_hub: Vec<ClaimToolItemDto>,
    pub refreshed_at_ms: i64,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub struct ClaimToolActivityEntryDto {
    pub timestamp_ms: i64,
    pub level: ClaimToolActivityLevel,
    pub category: Option<ClaimToolCategory>,
    pub action: String,
    pub message: String,
}

#[derive(Debug, Clone, Default, Serialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub struct ClaimToolSnapshotDto {
    pub auto_claim_enabled: bool,
    pub is_running: bool,
    pub last_run_at_ms: Option<i64>,
    pub last_error: Option<String>,
    pub recent_activity: Vec<ClaimToolActivityEntryDto>,
}

#[derive(Debug, Clone, Default, Serialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub struct ClaimToolRunResultDto {
    pub snapshot: ClaimToolSnapshotDto,
    pub claimed: u32,
    pub skipped: u32,
    pub failed: u32,
}

#[derive(Debug, Clone, Default, Deserialize, TS)]
#[ts(export, export_to = "claim_tool.ts")]
#[serde(rename_all = "camelCase")]
pub struct ClaimToolClaimRequestDto {
    pub rewards: Vec<String>,
    pub missions: Vec<String>,
    pub event_hub: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RewardGrantClaim {
    pub grant_id: String,
    pub reward_group_id: String,
    pub selections: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MissionClaim {
    pub mission_id: String,
    pub reward_groups: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EventHubClaim {
    pub event_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClaimResolution<T> {
    Claimable(T),
    Skipped(String),
}

pub fn resolve_reward_grant_claim(grant: &LcuRewardGrant) -> ClaimResolution<RewardGrantClaim> {
    if !grant.info.status.eq_ignore_ascii_case("PENDING_SELECTION") {
        return ClaimResolution::Skipped("reward grant is not pending selection".to_string());
    }

    let grant_id = trimmed_or_none(&grant.info.id);
    let reward_group_id = trimmed_or_none(&grant.info.reward_group_id)
        .or_else(|| trimmed_or_none(&grant.reward_group.id));
    let Some(grant_id) = grant_id else {
        return ClaimResolution::Skipped("reward grant id is missing".to_string());
    };
    let Some(reward_group_id) = reward_group_id else {
        return ClaimResolution::Skipped("reward group id is missing".to_string());
    };

    let max_selections = grant
        .reward_group
        .selection_strategy_config
        .as_ref()
        .and_then(|config| config.max_selections_allowed)
        .unwrap_or(1);
    if max_selections != 1 {
        return ClaimResolution::Skipped("reward grant requires multiple selections".to_string());
    }

    let selectable_rewards = grant
        .reward_group
        .rewards
        .iter()
        .filter_map(|reward| trimmed_or_none(&reward.id))
        .collect::<Vec<_>>();

    match selectable_rewards.as_slice() {
        [reward_id] => ClaimResolution::Claimable(RewardGrantClaim {
            grant_id,
            reward_group_id,
            selections: vec![reward_id.clone()],
        }),
        [] => ClaimResolution::Skipped("reward grant has no selectable reward".to_string()),
        _ => ClaimResolution::Skipped("reward grant has multiple reward choices".to_string()),
    }
}

pub fn reward_grant_item(grant: &LcuRewardGrant) -> ClaimToolItemDto {
    let reward = grant.reward_group.rewards.first();
    let resolution = resolve_reward_grant_claim(grant);
    let (status, reason) = status_from_resolution(&resolution);
    ClaimToolItemDto {
        id: grant.info.id.clone(),
        category: ClaimToolCategory::Reward,
        title: display_text(
            &grant.reward_group.localizations.title,
            reward.map(|item| item.localizations.title.as_str()),
            "Unknown reward",
        ),
        subtitle: reward.and_then(|item| optional_display_text(&item.localizations.description)),
        icon_url: reward.and_then(|item| optional_display_text(&item.media.icon_url)),
        quantity: reward.map(|item| item.quantity).filter(|value| *value > 0),
        choice_count: grant.reward_group.rewards.len() as u32,
        status,
        reason,
        children: Vec::new(),
    }
}

pub fn resolve_mission_claim(mission: &LcuMission) -> ClaimResolution<MissionClaim> {
    if !mission.status.eq_ignore_ascii_case("SELECT_REWARDS") {
        return ClaimResolution::Skipped("mission is not waiting for reward selection".to_string());
    }

    let Some(mission_id) = trimmed_or_none(&mission.id) else {
        return ClaimResolution::Skipped("mission id is missing".to_string());
    };

    let max_group_count = mission
        .reward_strategy
        .as_ref()
        .and_then(|strategy| strategy.select_max_group_count)
        .unwrap_or(1);
    if max_group_count != 1 {
        return ClaimResolution::Skipped("mission requires multiple reward groups".to_string());
    }

    let reward_groups = unique_reward_groups(&mission.rewards);
    match reward_groups.as_slice() {
        [reward_group] => ClaimResolution::Claimable(MissionClaim {
            mission_id,
            reward_groups: vec![reward_group.clone()],
        }),
        [] => ClaimResolution::Skipped("mission has no selectable reward group".to_string()),
        _ => ClaimResolution::Skipped("mission has multiple reward group choices".to_string()),
    }
}

pub fn mission_item(mission: &LcuMission) -> ClaimToolItemDto {
    let resolution = resolve_mission_claim(mission);
    let (status, reason) = status_from_resolution(&resolution);
    let reward_groups = unique_reward_groups(&mission.rewards);
    let reward = mission.rewards.first();

    ClaimToolItemDto {
        id: mission.id.clone(),
        category: ClaimToolCategory::Mission,
        title: display_text(
            &mission.title,
            first_non_empty_str(&mission.internal_name, &mission.id),
            "Unknown mission",
        ),
        subtitle: optional_display_text(&mission.description)
            .or_else(|| reward.and_then(|item| optional_display_text(&item.description))),
        icon_url: reward.and_then(|item| optional_display_text(&item.icon_url)),
        quantity: reward.map(|item| item.quantity).filter(|value| *value > 0),
        choice_count: reward_groups.len() as u32,
        status,
        reason,
        children: mission_reward_previews(&mission.rewards),
    }
}

pub fn event_has_unclaimed_rewards(event: &LcuEventHubEvent) -> bool {
    event.event_info.unclaimed_reward_count > 0
}

pub fn resolve_event_hub_claim(
    event: &LcuEventHubEvent,
    reward_track_items: &[LcuEventHubRewardTrackItem],
    bonus_items: &[LcuEventHubRewardTrackItem],
) -> ClaimResolution<EventHubClaim> {
    if !event_has_unclaimed_rewards(event) {
        return ClaimResolution::Skipped("event has no unclaimed rewards".to_string());
    }

    let Some(event_id) = trimmed_or_none(&event.event_id) else {
        return ClaimResolution::Skipped("event id is missing".to_string());
    };

    let items = reward_track_items
        .iter()
        .chain(bonus_items.iter())
        .collect::<Vec<_>>();

    if items.is_empty() {
        return ClaimResolution::Skipped("event reward track is empty".to_string());
    }

    if items.iter().any(|item| unselected_options(item).len() > 1) {
        return ClaimResolution::Skipped(
            "event reward track has multiple reward choices".to_string(),
        );
    }

    if !items
        .iter()
        .any(|item| !unselected_options(item).is_empty())
    {
        return ClaimResolution::Skipped("event has no selectable reward option".to_string());
    }

    ClaimResolution::Claimable(EventHubClaim { event_id })
}

pub fn event_hub_item(
    event: &LcuEventHubEvent,
    reward_track_items: &[LcuEventHubRewardTrackItem],
    bonus_items: &[LcuEventHubRewardTrackItem],
) -> ClaimToolItemDto {
    let resolution = resolve_event_hub_claim(event, reward_track_items, bonus_items);
    let (status, reason) = status_from_resolution(&resolution);
    let children = reward_track_items
        .iter()
        .chain(bonus_items.iter())
        .flat_map(|item| {
            unselected_options(item)
                .into_iter()
                .map(event_reward_preview)
        })
        .collect::<Vec<_>>();
    let choice_count = reward_track_items
        .iter()
        .chain(bonus_items.iter())
        .map(|item| unselected_options(item).len())
        .max()
        .unwrap_or(0) as u32;

    ClaimToolItemDto {
        id: event.event_id.clone(),
        category: ClaimToolCategory::EventHub,
        title: display_text(
            &event.event_info.event_name,
            Some(&event.event_id),
            "Unknown event",
        ),
        subtitle: None,
        icon_url: children.first().and_then(|child| child.icon_url.clone()),
        quantity: Some(u64::from(event.event_info.unclaimed_reward_count))
            .filter(|value| *value > 0),
        choice_count,
        status,
        reason,
        children,
    }
}

fn status_from_resolution<T>(
    resolution: &ClaimResolution<T>,
) -> (ClaimToolItemStatus, Option<String>) {
    match resolution {
        ClaimResolution::Claimable(_) => (ClaimToolItemStatus::Claimable, None),
        ClaimResolution::Skipped(reason) => (ClaimToolItemStatus::Skipped, Some(reason.clone())),
    }
}

fn trimmed_or_none(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed.to_string())
}

fn optional_display_text(value: &str) -> Option<String> {
    trimmed_or_none(value)
}

fn display_text(value: &str, fallback: Option<&str>, default_value: &str) -> String {
    trimmed_or_none(value)
        .or_else(|| fallback.and_then(trimmed_or_none))
        .unwrap_or_else(|| default_value.to_string())
}

fn first_non_empty_str<'a>(first: &'a str, second: &'a str) -> Option<&'a str> {
    if !first.trim().is_empty() {
        return Some(first);
    }
    if !second.trim().is_empty() {
        return Some(second);
    }
    None
}

fn unique_reward_groups(rewards: &[LcuMissionReward]) -> Vec<String> {
    let mut groups = rewards
        .iter()
        .filter_map(|reward| trimmed_or_none(&reward.reward_group))
        .collect::<Vec<_>>();
    groups.sort();
    groups.dedup();
    groups
}

fn mission_reward_previews(rewards: &[LcuMissionReward]) -> Vec<ClaimToolRewardPreviewDto> {
    rewards
        .iter()
        .enumerate()
        .map(|(index, reward)| ClaimToolRewardPreviewDto {
            id: trimmed_or_none(&reward.reward_group)
                .unwrap_or_else(|| format!("mission-reward-{index}")),
            title: display_text(
                &reward.description,
                trimmed_or_none(&reward.reward_type).as_deref(),
                "Mission reward",
            ),
            subtitle: trimmed_or_none(&reward.reward_type),
            icon_url: trimmed_or_none(&reward.icon_url),
            quantity: Some(reward.quantity).filter(|value| *value > 0),
        })
        .collect()
}

fn unselected_options(item: &LcuEventHubRewardTrackItem) -> Vec<&LcuEventHubRewardOption> {
    item.reward_options
        .iter()
        .filter(|option| option.state.eq_ignore_ascii_case("Unselected"))
        .collect()
}

fn event_reward_preview(option: &LcuEventHubRewardOption) -> ClaimToolRewardPreviewDto {
    ClaimToolRewardPreviewDto {
        id: display_text(
            &option.reward_group_id,
            first_non_empty_str(&option.reward_name, ""),
            "event-reward",
        ),
        title: display_text(
            &option.reward_name,
            Some(&option.reward_group_id),
            "Event reward",
        ),
        subtitle: None,
        icon_url: trimmed_or_none(&option.thumb_icon_path),
        quantity: None,
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        resolve_event_hub_claim, resolve_mission_claim, resolve_reward_grant_claim,
        ClaimResolution, EventHubClaim, MissionClaim, RewardGrantClaim,
    };
    use crate::shards::lcu::concepts::claim::{
        LcuEventHubEvent, LcuEventHubRewardTrackItem, LcuMission, LcuRewardGrant,
    };

    fn reward_grant(rewards: serde_json::Value) -> LcuRewardGrant {
        serde_json::from_value(json!({
            "info": {
                "id": "grant-1",
                "status": "PENDING_SELECTION",
                "rewardGroupId": "group-1"
            },
            "rewardGroup": {
                "id": "group-1",
                "localizations": {
                    "title": "Capsule",
                    "description": "A reward capsule"
                },
                "selectionStrategyConfig": {
                    "maxSelectionsAllowed": 1
                },
                "rewards": rewards
            }
        }))
        .unwrap_or_default()
    }

    fn mission(rewards: serde_json::Value) -> LcuMission {
        serde_json::from_value(json!({
            "id": "mission-1",
            "status": "SELECT_REWARDS",
            "internalName": "Mission",
            "title": "Mission",
            "rewardStrategy": {
                "selectMaxGroupCount": 1
            },
            "rewards": rewards
        }))
        .unwrap_or_default()
    }

    fn event(unclaimed_reward_count: u32) -> LcuEventHubEvent {
        serde_json::from_value(json!({
            "eventId": "event-1",
            "eventInfo": {
                "eventName": "Event",
                "unclaimedRewardCount": unclaimed_reward_count
            }
        }))
        .unwrap_or_default()
    }

    fn track_item(options: serde_json::Value) -> LcuEventHubRewardTrackItem {
        serde_json::from_value(json!({
            "rewardOptions": options
        }))
        .unwrap_or_default()
    }

    #[test]
    fn single_reward_grant_is_auto_claimable() {
        let grant = reward_grant(json!([
            {
                "id": "reward-1",
                "itemType": "CHEST",
                "quantity": 1,
                "localizations": {
                    "title": "Chest",
                    "description": "A chest"
                },
                "media": {
                    "iconUrl": "/lol-game-data/assets/reward.png"
                }
            }
        ]));

        let result = resolve_reward_grant_claim(&grant);

        assert_eq!(
            result,
            ClaimResolution::Claimable(RewardGrantClaim {
                grant_id: "grant-1".to_string(),
                reward_group_id: "group-1".to_string(),
                selections: vec!["reward-1".to_string()],
            })
        );
    }

    #[test]
    fn multi_reward_grant_is_skipped() {
        let grant = reward_grant(json!([
            { "id": "reward-1" },
            { "id": "reward-2" }
        ]));

        let result = resolve_reward_grant_claim(&grant);

        assert!(matches!(result, ClaimResolution::Skipped(_)));
    }

    #[test]
    fn single_reward_mission_is_auto_claimable() {
        let mission = mission(json!([
            {
                "rewardGroup": "mission-group-1",
                "rewardType": "XP",
                "quantity": 100
            }
        ]));

        let result = resolve_mission_claim(&mission);

        assert_eq!(
            result,
            ClaimResolution::Claimable(MissionClaim {
                mission_id: "mission-1".to_string(),
                reward_groups: vec!["mission-group-1".to_string()],
            })
        );
    }

    #[test]
    fn multi_reward_group_mission_is_skipped() {
        let mission = mission(json!([
            { "rewardGroup": "mission-group-1" },
            { "rewardGroup": "mission-group-2" }
        ]));

        let result = resolve_mission_claim(&mission);

        assert!(matches!(result, ClaimResolution::Skipped(_)));
    }

    #[test]
    fn event_with_single_unselected_reward_is_auto_claimable() {
        let event = event(1);
        let track = track_item(json!([
            {
                "rewardGroupId": "event-reward-1",
                "rewardName": "Token",
                "state": "Unselected",
                "thumbIconPath": "/lol-game-data/assets/token.png"
            }
        ]));

        let result = resolve_event_hub_claim(&event, &[track], &[]);

        assert_eq!(
            result,
            ClaimResolution::Claimable(EventHubClaim {
                event_id: "event-1".to_string(),
            })
        );
    }

    #[test]
    fn event_with_multi_choice_reward_is_skipped() {
        let event = event(1);
        let track = track_item(json!([
            { "rewardGroupId": "event-reward-1", "state": "Unselected" },
            { "rewardGroupId": "event-reward-2", "state": "Unselected" }
        ]));

        let result = resolve_event_hub_claim(&event, &[track], &[]);

        assert!(matches!(result, ClaimResolution::Skipped(_)));
    }
}
