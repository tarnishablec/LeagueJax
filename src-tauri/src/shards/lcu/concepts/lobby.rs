use super::EventType;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct LobbyEvent {
    pub event_type: EventType,
    /// "/lol-lobby/v2/lobby"
    pub uri: String,
    pub data: LobbyData,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct LobbyData {
    pub can_start_activity: bool,
    pub game_config: GameConfig,
    pub invitations: Vec<Invitation>,
    pub local_member: Member,
    pub members: Vec<Member>,
    pub muc_jwt_dto: MucJwtDto,
    pub multi_user_chat_id: String,
    pub multi_user_chat_password: String,
    pub party_id: String,
    pub party_type: String,
    pub popular_champions: Vec<serde_json::Value>,
    pub restrictions: Vec<serde_json::Value>,
    pub scarce_positions: Vec<serde_json::Value>,
    pub warnings: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct GameConfig {
    pub allowable_premade_sizes: Vec<u32>,
    pub custom_lobby_name: String,
    pub custom_mutator_name: String,
    pub custom_rewards_disabled_reasons: Vec<serde_json::Value>,
    pub custom_spectator_policy: String,
    pub custom_spectators: Vec<serde_json::Value>,
    pub custom_team100: Vec<Member>,
    pub custom_team200: Vec<Member>,
    pub game_mode: String,
    pub is_custom: bool,
    pub is_lobby_full: bool,
    pub is_team_builder_managed: bool,
    pub map_id: u32,
    pub max_human_players: u32,
    pub max_lobby_size: u32,
    pub max_lobby_spectator_count: u32,
    pub max_team_size: u32,
    pub num_players_per_team: u32,
    pub number_of_teams_in_lobby: u32,
    pub pick_type: String,
    pub premade_size_allowed: bool,
    pub queue_id: u32,
    pub should_force_scarce_position_selection: bool,
    pub show_position_selector: bool,
    pub show_quick_play_slot_selection: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct Member {
    pub allowed_change_activity: bool,
    pub allowed_invite_others: bool,
    pub allowed_kick_others: bool,
    pub allowed_start_activity: bool,
    pub allowed_toggle_invite: bool,
    pub auto_fill_eligible: bool,
    pub auto_fill_protected_for_promos: bool,
    pub auto_fill_protected_for_remedy: bool,
    pub auto_fill_protected_for_soloing: bool,
    pub auto_fill_protected_for_streaking: bool,
    pub bot_champion_id: u32,
    pub bot_difficulty: String,
    pub bot_id: String,
    pub bot_position: String,
    pub bot_uuid: String,
    pub first_position_preference: String,
    pub intra_subteam_position: Option<serde_json::Value>,
    pub is_bot: bool,
    pub is_leader: bool,
    pub is_spectator: bool,
    pub member_data: Option<serde_json::Value>,
    pub player_slots: Vec<serde_json::Value>,
    pub puuid: String,
    pub ready: bool,
    pub second_position_preference: String,
    pub show_ghosted_banner: bool,
    pub strawberry_map_id: Option<serde_json::Value>,
    pub subteam_index: Option<serde_json::Value>,
    pub summoner_icon_id: i32,
    pub summoner_id: u64,
    pub summoner_internal_name: String,
    pub summoner_level: u32,
    pub summoner_name: String,
    pub team_id: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct Invitation {
    pub invitation_id: String,
    pub invitation_type: String,
    pub state: String,
    pub timestamp: String,
    pub to_puuid: String,
    pub to_summoner_id: u64,
    pub to_summoner_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct MucJwtDto {
    pub channel_claim: String,
    pub domain: String,
    pub jwt: String,
    pub target_region: String,
}
