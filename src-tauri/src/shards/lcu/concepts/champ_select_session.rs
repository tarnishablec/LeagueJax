use super::{EventType, LanePosition};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct ChampSelectSession {
    pub event_type: EventType,
    /// /lol-champ-select/v1/session
    pub uri: String,
    pub data: ChampSelectSessionData,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct ChampSelectSessionData {
    pub actions: Vec<Vec<Action>>,
    pub allow_battle_boost: bool,
    #[serde(alias = "allowDuplicatePicks")]
    pub allow_duplicated_picks: bool,
    pub allow_locked_events: bool,
    pub allow_player_pick_same_champion: bool,
    pub allow_rerolling: bool,
    pub allow_skin_selection: bool,
    pub allow_subset_champion_picks: bool,
    pub bans: Bans,
    pub bench_champions: Vec<BenchChampion>,
    pub bench_enabled: bool,
    pub boostable_skin_count: u64,
    pub chat_details: ChatDetails,
    pub counter: i64,
    pub disallow_banning_teammate_hovered_champions: bool,
    pub game_id: u64,
    pub has_simultaneous_bans: bool,
    pub has_simultaneous_picks: bool,
    pub id: String,
    pub is_custom_game: bool,
    pub is_legacy_champ_select: bool,
    pub is_spectating: bool,
    pub local_player_cell_id: i64,
    pub locked_event_index: i64,
    pub my_team: Vec<TeamMember>,
    pub pick_order_swaps: Vec<Swap>,
    pub position_swaps: Vec<Swap>,
    pub queue_id: u64,
    pub rerolls_remaining: u64,
    pub show_quit_button: bool,
    pub skip_champion_select: bool,
    pub their_team: Vec<TeamMember>,
    pub timer: Timer,
    pub trades: Vec<Swap>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct Swap {
    pub cell_id: u64,
    pub id: u64,
    pub state: String, // AVAILABLE
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct BenchChampion {
    pub champion_id: u64,
    pub is_priority: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS, PartialEq)]
#[ts(export, export_to = "lcu_events.ts")]
#[allow(clippy::upper_case_acronyms)]
pub enum NameVisibilityType {
    HIDDEN,
    #[default]
    #[serde(other)]
    VISIBLE,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct TeamMember {
    pub assigned_position: LanePosition,
    pub cell_id: u64,
    pub champion_id: u64,
    pub champion_pick_intent: u64,
    pub game_name: String,
    pub internal_name: String,
    #[serde(alias = "isAutofilled")]
    pub is_auto_filled: bool,
    pub is_humanoid: bool,
    pub name_visibility_type: NameVisibilityType, // VISIBLE | HIDDEN
    #[serde(alias = "obfuscatedPuuid")]
    pub obfuscate_puuid: String,
    #[serde(alias = "obfuscatedSummonerId")]
    pub obfuscate_summoner_id: u64,
    pub pick_mode: u64,
    pub pick_turn: u64,
    pub player_alias: String,
    pub player_type: String,
    pub puuid: String,
    pub selected_skin_id: u64,
    pub spell1_id: u64,
    pub spell2_id: u64,
    pub summoner_id: i64,
    pub tag_line: String,
    pub team: u64,
    pub ward_skin_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct Action {
    pub actor_cell_id: i64,
    pub champion_id: u64,
    pub completed: bool,
    pub duration: u64,
    pub id: u64,
    pub is_ally_action: bool,
    pub is_in_progress: bool,
    pub pick_turn: u64,
    pub r#type: String, // ban | pick | ten_bans_reveal
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct Timer {
    #[serde(alias = "adjustedTimeLeftInPhase")]
    pub adjust_time_left_in_phase: u64,
    #[serde(alias = "internalNowInEpochMs")]
    pub internal_now_epoc_ms: u64,
    pub is_infinite: bool,
    pub phase: String,
    pub total_time_in_phase: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct ChatDetails {
    pub muc_jwt_dto: MucJwtDto,
    pub multi_user_chat_id: String,
    pub multi_user_chat_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct MucJwtDto {
    pub channel_claim: String,
    pub domain: String,
    pub jwt: String,
    pub target_region: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct Bans {
    #[ts(type = "Array<Record<string, unknown>>")]
    pub my_team_bans: Vec<serde_json::Value>,
    pub num_bans: u64,
    #[ts(type = "Array<Record<string, unknown>>")]
    pub their_team_bans: Vec<serde_json::Value>,
}
