use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::concepts::champ_select_session::{
    Action, ChampSelectSessionData, NameVisibilityType, TeamMember,
};
use crate::shards::lcu::concepts::gameflow_session::GameflowSessionData;
use crate::shards::lcu::concepts::matchmaking_ready_check::MatchmakingReadyCheckData;
use crate::shards::lcu::concepts::matchmaking_search::MatchmakingSearchData;
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::lcu::concepts::teambuilder_tbd_game::{
    TeambuilderCell, TeambuilderTbdGamePayload,
};
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
    pub enemy_champion_picks: Vec<EnemyChampionPick>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
#[ts(export, export_to = "ongoing_game.ts")]
#[serde(rename_all = "camelCase")]
pub struct EnemyChampionPick {
    pub cell_id: u64,
    pub champion_id: u32,
    pub position: String,
}

// their_team wins when it is set. Otherwise use the latest completed enemy
// pick, then the teambuilder cell. Hover and bans stay out.
pub fn enemy_champion_picks(
    phase: OngoingGamePhase,
    session: Option<&ChampSelectSessionData>,
    teambuilder: Option<&TeambuilderTbdGamePayload>,
) -> Vec<EnemyChampionPick> {
    if phase != OngoingGamePhase::ChampSelect {
        return Vec::new();
    }

    let enemy_cells = teambuilder
        .map(|payload| payload.champion_select_state.cells.enemy_team.as_slice())
        .unwrap_or(&[]);
    let locks = completed_enemy_locks(session);
    let mut seen = Vec::new();
    let mut picks = Vec::new();

    if let Some(session) = session {
        for member in &session.their_team {
            if !claim_cell(&mut seen, member.cell_id) {
                continue;
            }
            let Some(champion_id) =
                champion_for_cell(member.champion_id, member.cell_id, &locks, enemy_cells)
            else {
                continue;
            };
            picks.push(EnemyChampionPick {
                cell_id: member.cell_id,
                champion_id,
                position: resolved_position(
                    member.assigned_position,
                    teambuilder_lane(enemy_cells, member.cell_id),
                ),
            });
        }
    }

    for (cell_id, champion_id) in locks {
        if !claim_cell(&mut seen, cell_id) {
            continue;
        }
        picks.push(EnemyChampionPick {
            cell_id,
            champion_id,
            position: resolved_position(LanePosition::None, teambuilder_lane(enemy_cells, cell_id)),
        });
    }

    for cell in enemy_cells {
        if session.is_some_and(|current| is_ally_cell(current, cell.cell_id))
            || !claim_cell(&mut seen, cell.cell_id)
        {
            continue;
        }
        let Some(champion_id) = positive_champion_id(cell.champion_id) else {
            continue;
        };
        picks.push(EnemyChampionPick {
            cell_id: cell.cell_id,
            champion_id,
            position: teambuilder_lane_label(&cell.assigned_position).to_string(),
        });
    }

    picks
}

fn completed_enemy_locks(session: Option<&ChampSelectSessionData>) -> Vec<(u64, u32)> {
    let Some(session) = session else {
        return Vec::new();
    };
    let mut locks: Vec<(u64, u32)> = Vec::new();
    for group in &session.actions {
        for action in group {
            let Some((cell_id, champion_id)) = completed_enemy_pick(session, action) else {
                continue;
            };
            if let Some(existing) = locks.iter_mut().find(|lock| lock.0 == cell_id) {
                existing.1 = champion_id;
            } else {
                locks.push((cell_id, champion_id));
            }
        }
    }
    locks
}

fn completed_enemy_pick(session: &ChampSelectSessionData, action: &Action) -> Option<(u64, u32)> {
    if !action.completed || action.is_ally_action || !action.r#type.eq_ignore_ascii_case("pick") {
        return None;
    }
    let cell_id = u64::try_from(action.actor_cell_id).ok()?;
    if is_ally_cell(session, cell_id) {
        return None;
    }
    positive_champion_id(action.champion_id).map(|champion_id| (cell_id, champion_id))
}

fn champion_for_cell(
    their_champion_id: u64,
    cell_id: u64,
    locks: &[(u64, u32)],
    enemy_cells: &[TeambuilderCell],
) -> Option<u32> {
    positive_champion_id(their_champion_id)
        .or_else(|| {
            locks
                .iter()
                .find(|lock| lock.0 == cell_id)
                .map(|lock| lock.1)
        })
        .or_else(|| {
            enemy_cells
                .iter()
                .find(|cell| cell.cell_id == cell_id)
                .and_then(|cell| positive_champion_id(cell.champion_id))
        })
}

fn positive_champion_id(champion_id: u64) -> Option<u32> {
    match u32::try_from(champion_id) {
        Ok(champion_id) if champion_id > 0 => Some(champion_id),
        _ => None,
    }
}

fn is_ally_cell(session: &ChampSelectSessionData, cell_id: u64) -> bool {
    session
        .my_team
        .iter()
        .any(|member| member.cell_id == cell_id)
}

fn claim_cell(seen: &mut Vec<u64>, cell_id: u64) -> bool {
    if seen.contains(&cell_id) {
        return false;
    }
    seen.push(cell_id);
    true
}

fn teambuilder_lane(enemy_cells: &[TeambuilderCell], cell_id: u64) -> Option<&str> {
    enemy_cells
        .iter()
        .find(|cell| cell.cell_id == cell_id)
        .map(|cell| cell.assigned_position.as_str())
}

fn resolved_position(primary: LanePosition, fallback: Option<&str>) -> String {
    let primary = opgg_position(primary);
    if !primary.is_empty() {
        return primary.to_string();
    }
    fallback
        .map(teambuilder_lane_label)
        .unwrap_or("")
        .to_string()
}

fn opgg_position(position: LanePosition) -> &'static str {
    match position {
        LanePosition::Top => "TOP",
        LanePosition::Jungle => "JUNGLE",
        LanePosition::Middle => "MID",
        LanePosition::Bottom => "ADC",
        LanePosition::Utility => "SUPPORT",
        LanePosition::None | LanePosition::Fill | LanePosition::AFK => "",
    }
}

fn teambuilder_lane_label(raw: &str) -> &'static str {
    opgg_position(match raw.trim().to_ascii_lowercase().as_str() {
        "top" => LanePosition::Top,
        "jungle" | "jg" => LanePosition::Jungle,
        "middle" | "mid" => LanePosition::Middle,
        "bottom" | "bot" | "adc" => LanePosition::Bottom,
        "utility" | "support" | "sup" => LanePosition::Utility,
        _ => LanePosition::None,
    })
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shards::lcu::concepts::teambuilder_tbd_game::{
        PhaseName, Subphase, TeambuilderCells, TeambuilderChampionSelectState,
    };

    fn member(cell_id: u64, champion_id: u64, position: LanePosition) -> TeamMember {
        TeamMember {
            cell_id,
            champion_id,
            assigned_position: position,
            ..TeamMember::default()
        }
    }

    fn pick_action(cell_id: i64, champion_id: u64, kind: &str) -> Action {
        Action {
            actor_cell_id: cell_id,
            champion_id,
            completed: true,
            is_ally_action: false,
            r#type: kind.to_string(),
            ..Action::default()
        }
    }

    fn enemy_cell(cell_id: u64, champion_id: u64, position: &str) -> TeambuilderCell {
        TeambuilderCell {
            cell_id,
            champion_id,
            assigned_position: position.to_string(),
            ..TeambuilderCell::default()
        }
    }

    fn teambuilder(enemy_team: Vec<TeambuilderCell>) -> TeambuilderTbdGamePayload {
        TeambuilderTbdGamePayload {
            counter: 1,
            phase_name: PhaseName::CHAMPION_SELECT,
            queue_id: 420,
            game_id: 1,
            context_id: String::new(),
            champion_select_state: TeambuilderChampionSelectState {
                team_id: String::new(),
                team_chat_room_id: String::new(),
                subphase: Subphase::BAN_PICK,
                cells: TeambuilderCells {
                    allied_team: Vec::new(),
                    enemy_team,
                },
                local_player_cell_id: 0,
            },
            request_guid: String::new(),
        }
    }

    fn picks_of(
        session: Option<&ChampSelectSessionData>,
        teambuilder: Option<&TeambuilderTbdGamePayload>,
    ) -> Vec<EnemyChampionPick> {
        enemy_champion_picks(OngoingGamePhase::ChampSelect, session, teambuilder)
    }

    #[test]
    fn enemy_picks_keep_locked_champions_only() {
        let mut hovering = member(5, 0, LanePosition::Middle);
        hovering.champion_pick_intent = 122;
        let mut session = ChampSelectSessionData::default();
        session.their_team = vec![hovering, member(4, 86, LanePosition::Top)];

        assert_eq!(
            picks_of(Some(&session), None),
            vec![EnemyChampionPick {
                cell_id: 4,
                champion_id: 86,
                position: "TOP".to_string(),
            }]
        );
        assert!(enemy_champion_picks(OngoingGamePhase::InGame, Some(&session), None).is_empty());
    }

    #[test]
    fn completed_enemy_pick_fills_a_slot_whose_champion_id_is_still_zero() {
        let mut session = ChampSelectSessionData::default();
        session.their_team = vec![member(4, 0, LanePosition::Jungle)];
        session.actions = vec![vec![pick_action(4, 55, "ban"), pick_action(4, 86, "pick")]];

        assert_eq!(
            picks_of(Some(&session), None),
            vec![EnemyChampionPick {
                cell_id: 4,
                champion_id: 86,
                position: "JUNGLE".to_string(),
            }]
        );
    }

    #[test]
    fn their_team_lock_wins_over_an_older_action_and_teambuilder_cell() {
        let mut session = ChampSelectSessionData::default();
        session.their_team = vec![member(4, 222, LanePosition::Top)];
        session.actions = vec![vec![
            pick_action(4, 86, "pick"),
            pick_action(4, 111, "pick"),
        ]];
        let payload = teambuilder(vec![enemy_cell(4, 99, "mid")]);

        assert_eq!(
            picks_of(Some(&session), Some(&payload)),
            vec![EnemyChampionPick {
                cell_id: 4,
                champion_id: 222,
                position: "TOP".to_string(),
            }]
        );
    }

    #[test]
    fn latest_completed_pick_is_used_when_their_team_has_not_caught_up() {
        let mut session = ChampSelectSessionData::default();
        session.their_team = vec![member(4, 0, LanePosition::None)];
        session.actions = vec![vec![
            pick_action(4, 86, "pick"),
            pick_action(4, 222, "pick"),
        ]];

        assert_eq!(
            picks_of(Some(&session), None),
            vec![EnemyChampionPick {
                cell_id: 4,
                champion_id: 222,
                position: String::new(),
            }]
        );
    }

    #[test]
    fn ally_actions_and_unfinished_picks_are_ignored() {
        let mut session = ChampSelectSessionData::default();
        session.my_team = vec![member(1, 0, LanePosition::Middle)];
        session.their_team = vec![member(4, 0, LanePosition::Top)];
        let mut ally = pick_action(1, 86, "pick");
        ally.is_ally_action = true;
        let mut hovering = pick_action(4, 122, "pick");
        hovering.completed = false;
        session.actions = vec![vec![ally, hovering]];

        assert!(picks_of(Some(&session), None).is_empty());
    }

    #[test]
    fn teambuilder_enemy_cell_supplies_a_lock_and_its_lane() {
        let mut intent_only = enemy_cell(5, 0, "top");
        intent_only.champion_pick_intent = 122;
        let payload = teambuilder(vec![intent_only, enemy_cell(6, 111, "support")]);

        assert_eq!(
            picks_of(None, Some(&payload)),
            vec![EnemyChampionPick {
                cell_id: 6,
                champion_id: 111,
                position: "SUPPORT".to_string(),
            }]
        );
    }

    #[test]
    fn action_without_a_team_slot_borrows_the_teambuilder_lane() {
        let mut session = ChampSelectSessionData::default();
        session.actions = vec![vec![pick_action(5, 22, "pick")]];
        let payload = teambuilder(vec![enemy_cell(5, 0, "mid")]);

        assert_eq!(
            picks_of(Some(&session), Some(&payload)),
            vec![EnemyChampionPick {
                cell_id: 5,
                champion_id: 22,
                position: "MID".to_string(),
            }]
        );
    }
}
