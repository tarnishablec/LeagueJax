use super::{EventType, LanePosition};
use crate::shards::lcu::concepts::gameflow_phase::Phase;
use crate::shards::lcu::concepts::maps::{LcuMapProperties, MapSpellRule};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct GameflowSession {
    pub event_type: EventType,
    /// /lol-gameflow/v1/session
    pub uri: String,
    pub data: GameflowSessionData,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct GameflowSessionData {
    pub game_client: GameClient,
    pub game_data: GameData,
    pub game_dodge: GameDodge,
    pub map: Map,
    pub phase: Phase,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct Map {
    #[ts(type = "Record<string, unknown>")]
    pub assets: serde_json::Value,
    #[ts(type = "Record<string, unknown>")]
    pub categorize_content_bundles: serde_json::Value,
    pub description: String,
    pub game_mode: String,
    pub game_mode_name: String,
    pub game_mode_short_name: String,
    pub game_mutator: String,
    pub id: u64,
    pub is_rgm: bool,
    pub map_string_id: String,
    pub name: String,
    pub per_position_disallowed_summoner_spells: HashMap<String, MapSpellRule>,
    pub per_position_required_summoner_spells: HashMap<String, MapSpellRule>,
    pub platform_id: String,
    pub platform_name: String,
    pub properties: LcuMapProperties,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct GameDodge {
    pub dodge_ids: Vec<u64>,
    pub phase: String,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct GameClient {
    pub observer_server_ip: String,
    pub observer_server_port: u16,
    pub running: bool,
    pub server_ip: String,
    pub server_port: u16,
    pub visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct GameData {
    pub game_id: u64,
    pub game_name: String,
    pub is_custom_game: bool,
    pub password: String,
    pub player_champion_selections: Vec<PlayerChampionSelection>,
    pub queue: Queue,
    pub spectator_key: String,
    pub spectators_allowed: bool,
    pub team_one: Vec<Team>,
    pub team_two: Vec<Team>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct Team {
    pub champion_id: u64,
    pub last_selected_skin_index: u64,
    pub profile_icon_id: u64,
    pub puuid: String,
    pub selected_position: LanePosition,
    pub selected_role: String,
    pub summoner_id: u64,
    pub summoner_internal_name: String,
    pub summoner_name: String,
    pub team_owner: bool,
    pub team_participant_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct PlayerChampionSelection {
    pub champion_id: i64,
    pub puuid: String,
    pub selected_skin_index: u64,
    pub spell1_id: u64,
    pub spell2_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct Queue {
    pub allowable_premade_sizes: Vec<u64>,
    pub are_free_champions_allowed: bool,
    pub asset_mutator: String,
    pub category: String,
    pub champions_required_to_play: u64,
    pub description: String,
    pub detailed_description: String,
    pub game_mode: String,
    pub game_type_config: GameTypeConfig,
    pub id: u64,
    pub is_bot_honoring_allowed: bool,
    pub is_custom: bool,
    pub is_ranked: bool,
    pub is_team_builder_managed: bool,
    pub last_toggle_off_time: u64,
    pub last_toggle_on_time: u64,
    pub map_id: u64,
    pub maximum_participant_list_size: u64,
    pub min_level: u64,
    pub minimum_participant_list_size: u64,
    pub name: String,
    pub num_player_per_team: u64,
    pub queue_availability: String,
    pub queue_rewards: QueueRewards,
    pub removal_from_game_allowed: bool,
    pub removal_from_game_delay_minutes: u64,
    pub short_name: String,
    pub show_position_selector: bool,
    pub spectator_enabled: bool,
    pub r#type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct QueueRewards {
    pub is_champion_points_enabled: bool,
    pub is_ip_enabled: bool,
    pub is_xp_enabled: bool,
    #[ts(type = "Array<Record<string, unknown>>")]
    pub party_size_ip_rewards: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct GameTypeConfig {
    pub advanced_learning_quests: bool,
    pub allow_trades: bool,
    pub ban_mode: String,
    pub ban_time_duration: u64,
    pub battle_boost: bool,
    pub cross_team_champion_pool: bool,
    pub death_match: bool,
    pub do_not_remove: bool,
    pub duplicated_pick: bool,
    pub exclusive_pick: bool,
    pub id: u64,
    pub learning_quests: bool,
    pub main_pick_timer_duration: u64,
    pub max_allowable_bans: u64,
    pub name: String,
    pub onboard_coop_beginner: bool,
    pub pick_mode: String,
    pub post_pick_timer_duration: u64,
    pub reroll: bool,
    pub team_champion_pool: bool,
}
