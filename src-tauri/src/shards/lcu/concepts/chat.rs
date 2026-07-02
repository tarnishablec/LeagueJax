use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(TS)]
#[ts(export, export_to = "lcu_chat.ts")]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LcuChatLolState {
    #[serde(default)]
    pub banner_id_selected: String,
    #[serde(default)]
    pub challenge_crystal_level: String,
    #[serde(default)]
    pub challenge_points: String,
    #[serde(default)]
    pub challenge_title_selected: String,
    #[serde(default)]
    pub challenge_tokens_selected: String,
    #[serde(default)]
    pub champion_id: String,
    #[serde(default)]
    pub companion_id: String,
    #[serde(default)]
    pub damage_skin_id: String,
    #[serde(default)]
    pub game_id: String,
    #[serde(default)]
    pub game_mode: String,
    #[serde(default)]
    pub game_queue_type: String,
    #[serde(default)]
    pub game_status: String,
    #[serde(default)]
    pub icon_override: String,
    #[serde(default)]
    pub init_rank_stat: String,
    #[serde(default)]
    pub init_summoner: String,
    #[serde(default)]
    pub is_observable: String,
    #[serde(default)]
    pub map_id: String,
    #[serde(default)]
    pub map_skin_id: String,
    #[serde(default)]
    pub profile_icon: String,
    #[serde(default)]
    pub pty: String,
    #[serde(default)]
    pub queue_id: String,
    #[serde(default)]
    pub regalia: String,
    #[serde(default)]
    pub skin_variant: String,
    #[serde(default)]
    pub skinname: String,
    #[serde(default)]
    pub time_stamp: String,
}

#[derive(TS)]
#[ts(export, export_to = "lcu_chat.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuChatFriend {
    #[serde(default)]
    pub availability: String,
    #[serde(default)]
    pub display_group_id: i64,
    #[serde(default)]
    pub display_group_name: String,
    #[serde(default)]
    pub game_name: String,
    #[serde(default)]
    pub game_tag: String,
    #[serde(default)]
    pub group_id: i64,
    #[serde(default)]
    pub group_name: String,
    #[serde(default)]
    pub icon: i64,
    pub id: String,
    #[serde(default)]
    pub is_p2_p_conversation_muted: bool,
    #[serde(default)]
    pub last_seen_online_timestamp: Option<String>,
    #[serde(default)]
    pub lol: LcuChatLolState,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub note: String,
    #[serde(default)]
    pub patchline: String,
    #[serde(default)]
    pub pid: String,
    #[serde(default)]
    pub platform_id: String,
    #[serde(default)]
    pub product: String,
    #[serde(default)]
    pub product_name: String,
    #[serde(default)]
    pub puuid: String,
    #[serde(default)]
    pub status_message: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub summoner_id: i64,
    #[serde(default)]
    pub time: i64,
}

#[derive(TS)]
#[ts(export, export_to = "lcu_chat.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuChatFriendGroup {
    #[serde(default)]
    pub collapsed: bool,
    pub id: i64,
    #[serde(default)]
    pub is_localized: bool,
    #[serde(default)]
    pub is_meta_group: bool,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub priority: i64,
}
