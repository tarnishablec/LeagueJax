use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::concepts::champ_select_session::{
    ChampSelectSessionData, NameVisibilityType, TeamMember,
};
use crate::shards::lcu::concepts::gameflow_session::GameflowSessionData;
use crate::shards::lcu::concepts::matchmaking_ready_check::MatchmakingReadyCheckData;
use crate::shards::lcu::concepts::matchmaking_search::MatchmakingSearchData;
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::lcu::concepts::teambuilder_tbd_game::TeambuilderTbdGamePayload;
use crate::shards::lcu::concepts::LanePosition;
use crate::shards::lcu::manager::FocusChange;
use crate::shards::sgp::matches::RawMatchSummaryGame;

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
pub enum OngoingGamePhase {
    #[default]
    Idle,
    Matchmaking,
    ReadyCheck,
    ChampSelect,
    InGame,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub enum OngoingGamePlayerLoadStatus {
    #[default]
    Idle,
    Loading,
    Ready,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameSummonerState {
    pub game_id: Option<u64>,
    pub puuid: String,
    pub team_id: u64,
    pub status: OngoingGamePlayerLoadStatus,
    pub summoner: Option<SummonerInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameMatchHistoryState {
    pub game_id: Option<u64>,
    pub puuid: String,
    pub team_id: u64,
    pub status: OngoingGamePlayerLoadStatus,
    pub games: Option<Vec<RawMatchSummaryGame>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub enum OngoingGameSlotKind {
    #[default]
    Player,
    Bot,
    Placeholder,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "camelCase")]
pub struct OngoingGameTeamMember {
    pub assigned_position: LanePosition,
    pub cell_id: u64,
    pub champion_id: u64,
    pub champion_pick_intent: u64,
    pub game_name: String,
    pub internal_name: String,
    pub is_auto_filled: bool,
    pub is_humanoid: bool,
    pub name_visibility_type: NameVisibilityType,
    pub obfuscate_puuid: String,
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
    pub slot_kind: OngoingGameSlotKind,
}

impl OngoingGameTeamMember {
    pub(crate) fn from_lcu_member(member: &TeamMember, slot_kind: OngoingGameSlotKind) -> Self {
        Self {
            assigned_position: member.assigned_position,
            cell_id: member.cell_id,
            champion_id: member.champion_id,
            champion_pick_intent: member.champion_pick_intent,
            game_name: member.game_name.clone(),
            internal_name: member.internal_name.clone(),
            is_auto_filled: member.is_auto_filled,
            is_humanoid: member.is_humanoid,
            name_visibility_type: member.name_visibility_type.clone(),
            obfuscate_puuid: member.obfuscate_puuid.clone(),
            obfuscate_summoner_id: member.obfuscate_summoner_id,
            pick_mode: member.pick_mode,
            pick_turn: member.pick_turn,
            player_alias: member.player_alias.clone(),
            player_type: member.player_type.clone(),
            puuid: member.puuid.clone(),
            selected_skin_id: member.selected_skin_id,
            spell1_id: member.spell1_id,
            spell2_id: member.spell2_id,
            summoner_id: member.summoner_id,
            tag_line: member.tag_line.clone(),
            team: member.team,
            ward_skin_id: member.ward_skin_id,
            slot_kind,
        }
    }
}

// ---------------------------------------------------------------------------
// Broadcast payloads
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameUpdated {
    pub phase: OngoingGamePhase,
    pub lifecycle_game_id: Option<u64>,
    /// User-selected match-history mode tag.
    /// - "__current_mode__": follow current queue mode
    /// - `q_xxx`: fixed queue mode
    /// - None: all modes
    pub match_history_tag: Option<String>,
    /// Queue id resolved from the current game context.
    pub effective_queue_id: Option<u64>,
    /// Effective SGP mode tag after resolving `match_history_tag` against current context.
    pub effective_mode_tag: Option<String>,
    pub match_histories_pending: bool,
    pub summoner_states: Vec<OngoingGameSummonerState>,
    pub history_states: Vec<OngoingGameMatchHistoryState>,
    pub gameflow_session: Option<GameflowSessionData>,
    pub matchmaking_search: Option<MatchmakingSearchData>,
    pub ready_check: Option<MatchmakingReadyCheckData>,
    pub champ_select_session: Option<ChampSelectSessionData>,
    pub team_members: Vec<OngoingGameTeamMember>,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameSummonersUpdated {
    pub phase: OngoingGamePhase,
    pub state: OngoingGameSummonerState,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "snake_case")]
pub struct OngoingGameMatchHistoriesUpdated {
    pub phase: OngoingGamePhase,
    pub state: OngoingGameMatchHistoryState,
}

// ---------------------------------------------------------------------------
// Unified broadcast event (single channel)
// ---------------------------------------------------------------------------

#[allow(clippy::large_enum_variant)]
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", content = "data")]
pub enum OngoingGameEvent {
    Updated(OngoingGameUpdated),
    SummonersUpdated(OngoingGameSummonersUpdated),
    MatchHistoriesUpdated(OngoingGameMatchHistoriesUpdated),
}

// ---------------------------------------------------------------------------
// Machine input events
// ---------------------------------------------------------------------------

use super::manager::MatchHistoryModeSetting;

#[derive(Debug)]
pub enum OngoingGameInput {
    // LCU Manager
    FocusChanged(FocusChange),

    // LCU WebSocket
    GameflowSessionUpdated(Box<GameflowSessionData>),
    MatchmakingSearchUpdated(Box<MatchmakingSearchData>),
    MatchmakingSearchDeleted,
    ReadyCheckUpdated(Box<MatchmakingReadyCheckData>),
    ReadyCheckDeleted,
    ChampSelectSessionUpdated(Box<ChampSelectSessionData>),
    TeambuilderTbdGameUpdated(Box<TeambuilderTbdGamePayload>),

    // Commands
    Refresh,
    RefreshMatchHistories,
    SetMatchHistoryMode(MatchHistoryModeSetting),

    // Task Results
    Seeded(Box<OngoingSessionSeed>),
    /// Summoner data loaded from LCU. `game_id` is the `ctx.lifecycle_game_id`
    /// captured when the task was spawned; the handler drops the result if
    /// the lifecycle has moved on, which prevents stale late-firing tasks from
    /// writing back after a game transition or an explicit refresh.
    SummonerLoaded {
        puuid: String,
        info: Option<Box<SummonerInfo>>,
        game_id: Option<u64>,
    },
    /// Match history loaded from SGP. See `SummonerLoaded` for `game_id` semantics.
    MatchHistoryLoaded {
        puuid: String,
        games: Option<Vec<RawMatchSummaryGame>>,
        game_id: Option<u64>,
    },
}
