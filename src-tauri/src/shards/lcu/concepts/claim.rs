use serde::Deserialize;

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuRewardGrant {
    pub info: LcuRewardGrantInfo,
    pub reward_group: LcuRewardGroup,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuRewardGrantInfo {
    pub id: String,
    pub status: String,
    pub reward_group_id: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuRewardGroup {
    pub id: String,
    pub localizations: LcuRewardLocalization,
    pub rewards: Vec<LcuReward>,
    pub selection_strategy_config: Option<LcuSelectionStrategyConfig>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuSelectionStrategyConfig {
    pub max_selections_allowed: Option<u32>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuReward {
    pub id: String,
    pub quantity: u64,
    pub localizations: LcuRewardLocalization,
    pub media: LcuRewardMedia,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuRewardLocalization {
    pub title: String,
    pub description: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuRewardMedia {
    pub icon_url: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuMission {
    pub id: String,
    pub status: String,
    pub internal_name: String,
    pub title: String,
    pub description: String,
    pub rewards: Vec<LcuMissionReward>,
    pub reward_strategy: Option<LcuMissionRewardStrategy>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuMissionRewardStrategy {
    pub select_max_group_count: Option<u32>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuMissionReward {
    pub reward_group: String,
    pub reward_type: String,
    pub description: String,
    pub icon_url: String,
    pub quantity: u64,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuEventHubEvent {
    pub event_id: String,
    pub event_info: LcuEventHubEventInfo,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuEventHubEventInfo {
    pub event_name: String,
    pub unclaimed_reward_count: u32,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuEventHubRewardTrackItem {
    pub reward_options: Vec<LcuEventHubRewardOption>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LcuEventHubRewardOption {
    pub reward_group_id: String,
    pub reward_name: String,
    pub state: String,
    pub thumb_icon_path: String,
}
