use super::EventType;
use crate::shards::lcu::maps::{LcuMapProperties, MapSpellRule};
use crate::shards::ongoing_game::events::gameflow_phase::Phase;
use std::collections::HashMap;

pub struct GameflowSession {
    event_type: EventType,
    /// /lol-gameflow/v1/session
    uri: String,
    data: GameflowSessionData,
}

pub struct GameflowSessionData {
    game_client: GameClient,
    game_data: GameData,
    game_dodge: GameDodge,
    map: Map,
    phase: Phase,
}

pub struct Map {
    assets: serde_json::Value,
    categorize_content_bundles: serde_json::Value,
    description: String,
    game_mode: String,
    game_mode_name: String,
    game_mode_short_name: String,
    game_mutator: String,
    id: u64,
    is_rgm: bool,
    map_string_id: String,
    name: String,
    pub per_position_disallowed_summoner_spells: HashMap<String, MapSpellRule>,
    pub per_position_required_summoner_spells: HashMap<String, MapSpellRule>,
    pub platform_id: String,
    pub platform_name: String,
    pub properties: LcuMapProperties,
}

pub struct GameDodge {
    dodge_ids: Vec<u64>,
    phase: String,
    state: String,
}

pub struct GameClient {
    observer_server_ip: String,
    observer_server_port: u16,
    running: bool,
    server_ip: String,
    server_port: u16,
    visible: bool,
}

pub struct GameData {
    game_id: u64,
    game_name: String,
    is_custom_game: bool,
    password: String,
    player_champion_selections: Vec<PlayerChampionSelection>,
    queue: Queue,
    spectator_key: String,
    spectators_allowed: bool,
    team_one: Vec<Team>,
    team_two: Vec<Team>,
}

pub struct Team {
    champion_id: u64,
    last_selected_skin_index: u64,
    profile_icon_id: u64,
    puuid: uuid::Uuid,
    selected_position: String,
    selected_role: String,
    summoner_id: u64,
    summoner_internal_name: String,
    summoner_name: String,
    team_owner: bool,
    team_participant_id: u64,
}

pub struct PlayerChampionSelection {
    champion_id: u64,
    puuid: uuid::Uuid,
    selected_skin_index: u64,
    spell1_id: u64,
    spell2_id: u64,
}

pub struct Queue {
    allowable_premade_sizes: Vec<u64>,
    are_free_champions_allowed: bool,
    asset_mutator: String,
    category: String,
    champions_required_to_play: u64,
    description: String,
    detailed_description: String,
    game_mode: String,
    game_type_config: GameTypeConfig,
    id: u64,
    is_bot_honoring_allowed: bool,
    is_custom: bool,
    is_ranked: bool,
    is_team_builder_managed: bool,
    last_toggle_off_time: u64,
    last_toggle_on_time: u64,
    map_id: u64,
    maximum_participant_list_size: u64,
    min_level: u64,
    minimum_participant_list_size: u64,
    name: String,
    num_player_per_team: u64,
    queue_availability: String,
    queue_rewards: QueueRewards,
    removal_from_game_allowed: bool,
    removal_from_game_delay_minutes: u64,
    short_name: String,
    show_position_selector: bool,
    spectator_enabled: bool,
    r#type: String,
}

pub struct QueueRewards {
    is_champion_points_enabled: bool,
    is_ip_enabled: bool,
    is_xp_enabled: bool,
    party_size_ip_rewards: Vec<()>,
}

pub struct GameTypeConfig {
    advanced_learning_quests: bool,
    allow_trades: bool,
    ban_mode: String,
    ban_time_duration: u64,
    battle_boost: bool,
    cross_team_champion_pool: bool,
    death_match: bool,
    do_not_remove: bool,
    duplicated_pick: bool,
    exclusive_pick: bool,
    id: u64,
    learning_quests: bool,
    main_pick_timer_duration: u64,
    max_allowable_bans: u64,
    name: String,
    onboard_coop_beginner: bool,
    pick_mode: String,
    post_pick_timer_duration: u64,
    reroll: bool,
    team_champion_pool: bool,
}
