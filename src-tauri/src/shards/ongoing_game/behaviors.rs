use maokai_gears::ops::task::TaskHandle;
use maokai_machine::Envelope;
use maokai_runner::{Behavior, EventReply, Transition};
use maokai_tree::{State, TreeView};

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::concepts::champ_select_session::{NameVisibilityType, TeamMember};
use crate::shards::lcu::concepts::gameflow_phase::Phase as GameflowPhase;
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::lcu::concepts::teambuilder_tbd_game::TeambuilderCell;
use crate::shards::lcu::concepts::LanePosition;
use crate::shards::sgp::matches::RawMatchSummaryGame;
use crate::shards::sgp::LcuSessionSgpExt;

use super::context::OngoingGameCtx;
use super::tree::{phase_of, ONGOING_TREE};
use super::types::{
    OngoingGameEvent, OngoingGameInput, OngoingGameMatchHistoriesUpdated,
    OngoingGameMatchHistoryState, OngoingGamePhase, OngoingGamePlayerLoadStatus,
    OngoingGameSummonerState, OngoingGameSummonersUpdated, OngoingGameUpdated,
};

const BOT_PUUID: &str = "BOT";

type Envo = Envelope<OngoingGameInput, OngoingGameCtx>;

// ── Helpers ──────────────────────────────────────────────────────────────

fn is_bot(puuid: &str) -> bool {
    puuid.is_empty() || puuid == BOT_PUUID
}

fn broadcast_updated(envo: &Envo, phase: OngoingGamePhase) {
    let ctx = envo.context();

    // Strip enemy data from champ-select session — UI only shows allies in this phase.
    let champ_select_session = ctx.champ_select_session.as_ref().map(|cs| {
        let mut cs = cs.clone();
        cs.their_team = Vec::new();
        cs.bans.their_team_bans = Vec::new();
        cs
    });

    // Strip `games` from history_states — those ride on the per-player
    // `MatchHistoriesUpdated` channel. Keeping them here would push multi-MB
    // payloads on every champ-select WS tick.
    let history_states: Vec<_> = ctx
        .history_states
        .values()
        .cloned()
        .map(|mut s| {
            s.games = None;
            s
        })
        .collect();

    let payload = OngoingGameUpdated {
        phase,
        lifecycle_game_id: ctx.lifecycle_game_id,
        match_history_tag: ctx.match_history_mode.payload_value(),
        effective_queue_id: ctx.effective_queue_id,
        effective_mode_tag: ctx.match_history_mode.effective_tag(ctx.effective_queue_id),
        match_histories_pending: ctx
            .history_states
            .values()
            .any(|s| s.status == OngoingGamePlayerLoadStatus::Loading),
        summoner_states: ctx.summoner_states.values().cloned().collect(),
        history_states,
        gameflow_session: ctx.gameflow_session.clone(),
        champ_select_session,
        team_members: ctx.team_members.clone(),
    };
    let channels = ctx.channels.clone();
    drop(ctx);
    channels.broadcast(OngoingGameEvent::Updated(payload));
}

/// Look up the roster team id and the lifecycle game id for a puuid.
/// Returns `(0, ctx.lifecycle_game_id)` when the puuid isn't on the roster.
fn player_lifecycle_fields(envo: &Envo, puuid: &str) -> (u64, Option<u64>) {
    let ctx = envo.context();
    let team = ctx
        .team_members
        .iter()
        .find(|m| m.puuid == puuid)
        .map(|m| m.team)
        .unwrap_or(0);
    (team, ctx.lifecycle_game_id)
}

fn init_summoner_state(envo: &Envo, puuid: &str) {
    let (team_id, game_id) = player_lifecycle_fields(envo, puuid);
    envo.context_mut().summoner_states.insert(
        puuid.to_owned(),
        OngoingGameSummonerState {
            game_id,
            puuid: puuid.to_owned(),
            team_id,
            status: OngoingGamePlayerLoadStatus::Loading,
            summoner: None,
        },
    );
}

fn init_history_state(envo: &Envo, puuid: &str) {
    let (team_id, game_id) = player_lifecycle_fields(envo, puuid);
    envo.context_mut().history_states.insert(
        puuid.to_owned(),
        OngoingGameMatchHistoryState {
            game_id,
            puuid: puuid.to_owned(),
            team_id,
            status: OngoingGamePlayerLoadStatus::Loading,
            games: None,
        },
    );
}

fn spawn_summoner_task(envo: &Envo, puuid: &str) {
    let puuid_owned = puuid.to_owned();
    let handle = envo.send().start_task(move |envo| async move {
        let (lcu, input_tx) = {
            let ctx = envo.context();
            (ctx.lcu_shard.clone(), ctx.input_tx.clone())
        };

        let info: Option<SummonerInfoSlot> = async {
            let manager = lcu.manager()?;
            let session = manager.focused().await?;
            session
                .api()
                .get_summoner_by_puuid_optional(&puuid_owned)
                .await
                .ok()
                .flatten()
                .map(SummonerInfoSlot)
        }
        .await;

        let _ = input_tx.send(OngoingGameInput::SummonerLoaded {
            puuid: puuid_owned,
            info: info.map(|slot| Box::new(slot.0)),
        });
    });
    envo.context_mut()
        .summoner_tasks
        .insert(puuid.to_owned(), handle);
}

fn spawn_history_task(envo: &Envo, puuid: &str) {
    let puuid_owned = puuid.to_owned();
    let handle = envo.send().start_task(move |envo| async move {
        let (lcu, sgp, count, tag, input_tx) = {
            let ctx = envo.context();
            (
                ctx.lcu_shard.clone(),
                ctx.sgp_shard.clone(),
                ctx.settings.match_history_count_value(),
                ctx.match_history_mode.effective_tag(ctx.effective_queue_id),
                ctx.input_tx.clone(),
            )
        };

        let games = async {
            let manager = lcu.manager()?;
            let session = manager.focused().await?;
            let sgp_session = session.to_sgp(&sgp).await.ok()?;
            let resp = sgp_session
                .api()
                .get_match_summaries(&puuid_owned, 0, count, tag.as_deref(), None)
                .await
                .ok()?;
            Some(resp.games)
        }
        .await;

        let _ = input_tx.send(OngoingGameInput::MatchHistoryLoaded {
            puuid: puuid_owned,
            games,
        });
    });
    envo.context_mut()
        .history_tasks
        .insert(puuid.to_owned(), handle);
}

fn spawn_seed_task(envo: &Envo) {
    let _ = envo.send().start_task(|envo| async move {
        let (lcu, input_tx) = {
            let ctx = envo.context();
            (ctx.lcu_shard.clone(), ctx.input_tx.clone())
        };

        let seed = async {
            let manager = lcu.manager()?;
            let session = manager.focused().await?;
            let api = session.api();
            let phase = api.get_gameflow_phase_typed().await.ok()?;

            let gameflow_session = match phase {
                GameflowPhase::ChampSelect | GameflowPhase::InProgress | GameflowPhase::InGame => {
                    api.get_gameflow_session_typed().await.ok()
                }
                _ => None,
            };

            // No direct GET for champ-select session exists in `lcu::api`; rely on WS push.
            let champ_select_session = None;

            let teambuilder_payload = if matches!(phase, GameflowPhase::ChampSelect) {
                api.get_teambuilder_tbd_game_message()
                    .await
                    .ok()
                    .flatten()
                    .map(|msg| msg.payload)
            } else {
                None
            };

            Some(OngoingSessionSeed {
                phase,
                gameflow_session,
                champ_select_session,
                teambuilder_payload,
            })
        }
        .await;

        if let Some(seed) = seed {
            let _ = input_tx.send(OngoingGameInput::Seeded(Box::new(seed)));
        }
    });
}

/// Collect non-bot puuids from the current roster — the set we actually
/// spawn summoner / match-history fetch tasks for.
fn team_puuids(envo: &Envo) -> Vec<String> {
    envo.context()
        .team_members
        .iter()
        .map(|m| m.puuid.clone())
        .filter(|p| !is_bot(p))
        .collect()
}

/// Pull `game_id` and `queue_id` off the latest gameflow session and
/// copy them into the ctx's lifecycle fields. No-op when either side is
/// absent — we never overwrite with `None`.
fn sync_lifecycle_ids_from_gameflow(envo: &Envo) {
    let (game_id, queue_id) = {
        let ctx = envo.context();
        match ctx.gameflow_session.as_ref() {
            Some(gs) => (Some(gs.game_data.game_id), Some(gs.game_data.queue.id)),
            None => (None, None),
        }
    };
    if game_id.is_some() {
        envo.context_mut().lifecycle_game_id = game_id;
    }
    if queue_id.is_some() {
        envo.context_mut().effective_queue_id = queue_id;
    }
}

fn spawn_all_fetch_tasks(envo: &Envo) {
    let puuids = team_puuids(envo);

    for puuid in &puuids {
        let should_spawn = {
            let ctx = envo.context();
            match ctx.summoner_states.get(puuid.as_str()) {
                None => true,
                Some(s) => s.status == OngoingGamePlayerLoadStatus::Idle,
            }
        };
        if should_spawn {
            init_summoner_state(envo, puuid);
            spawn_summoner_task(envo, puuid);
        }
    }

    for puuid in &puuids {
        let should_spawn = {
            let ctx = envo.context();
            match ctx.history_states.get(puuid.as_str()) {
                None => true,
                Some(s) => s.status == OngoingGamePlayerLoadStatus::Idle,
            }
        };
        if should_spawn {
            init_history_state(envo, puuid);
            spawn_history_task(envo, puuid);
        }
    }
}

fn stop_all_tasks(envo: &Envo) {
    let handles: Vec<TaskHandle> = {
        let ctx = envo.context();
        ctx.summoner_tasks
            .values()
            .chain(ctx.history_tasks.values())
            .copied()
            .collect()
    };
    for handle in handles {
        envo.stop_task(handle);
    }
    envo.context_mut().summoner_tasks.clear();
    envo.context_mut().history_tasks.clear();
}

fn stop_history_tasks(envo: &Envo) {
    let handles: Vec<TaskHandle> = envo.context().history_tasks.values().copied().collect();
    for handle in handles {
        envo.stop_task(handle);
    }
    envo.context_mut().history_tasks.clear();
}

fn restart_history_tasks(envo: &Envo) {
    for puuid in &team_puuids(envo) {
        init_history_state(envo, puuid);
        spawn_history_task(envo, puuid);
    }
}

// Tiny wrapper so we can propagate Option<SummonerInfo> through the async `?` chain
// without confusing nested Option types. The value we actually forward is `slot.0`.
struct SummonerInfoSlot(SummonerInfo);

// ── Shared event handlers ────────────────────────────────────────────────
//
// `ChampSelectBehavior` and `InGameBehavior` respond identically to a
// handful of inputs (per-player load results + user-initiated refresh
// commands). The helpers below centralize that logic, so each behavior's
// `on_event` only needs to describe its phase-specific branches.

fn handle_summoner_loaded(
    envo: &Envo,
    phase: OngoingGamePhase,
    puuid: &str,
    info: &Option<Box<SummonerInfo>>,
) -> EventReply {
    {
        let mut ctx = envo.context_mut();
        ctx.summoner_tasks.remove(puuid);
        if let Some(state) = ctx.summoner_states.get_mut(puuid) {
            state.status = if info.is_some() {
                OngoingGamePlayerLoadStatus::Ready
            } else {
                OngoingGamePlayerLoadStatus::Failed
            };
            state.summoner = info.as_deref().cloned();
        }
    }
    let (channels, state_opt) = {
        let ctx = envo.context();
        (
            ctx.channels.clone(),
            ctx.summoner_states.get(puuid).cloned(),
        )
    };
    if let Some(state) = state_opt {
        channels.broadcast(OngoingGameEvent::SummonersUpdated(
            OngoingGameSummonersUpdated { phase, state },
        ));
    }
    EventReply::Handled
}

fn handle_match_history_loaded(
    envo: &Envo,
    phase: OngoingGamePhase,
    puuid: &str,
    games: &Option<Vec<RawMatchSummaryGame>>,
) -> EventReply {
    {
        let mut ctx = envo.context_mut();
        ctx.history_tasks.remove(puuid);
        if let Some(state) = ctx.history_states.get_mut(puuid) {
            state.status = if games.is_some() {
                OngoingGamePlayerLoadStatus::Ready
            } else {
                OngoingGamePlayerLoadStatus::Failed
            };
            state.games = games.clone();
        }
    }
    let (channels, state_opt) = {
        let ctx = envo.context();
        (ctx.channels.clone(), ctx.history_states.get(puuid).cloned())
    };
    if let Some(state) = state_opt {
        channels.broadcast(OngoingGameEvent::MatchHistoriesUpdated(
            OngoingGameMatchHistoriesUpdated { phase, state },
        ));
    }
    EventReply::Handled
}

/// Try to handle inputs whose semantics don't depend on the current phase.
/// Returns `None` when the event is phase-specific and the caller must
/// dispatch it themselves.
fn try_handle_common_event(
    envo: &Envo,
    phase: OngoingGamePhase,
    event: &OngoingGameInput,
) -> Option<EventReply> {
    match event {
        OngoingGameInput::SummonerLoaded { puuid, info } => {
            Some(handle_summoner_loaded(envo, phase, puuid, info))
        }
        OngoingGameInput::MatchHistoryLoaded { puuid, games } => {
            Some(handle_match_history_loaded(envo, phase, puuid, games))
        }
        OngoingGameInput::RefreshMatchHistories => {
            stop_history_tasks(envo);
            restart_history_tasks(envo);
            broadcast_updated(envo, phase);
            Some(EventReply::Handled)
        }
        OngoingGameInput::SetMatchHistoryMode(mode) => {
            envo.context_mut().match_history_mode = mode.clone();
            broadcast_updated(envo, phase);
            Some(EventReply::Handled)
        }
        OngoingGameInput::Refresh => {
            spawn_seed_task(envo);
            Some(EventReply::Handled)
        }
        _ => None,
    }
}

// ── IdleBehavior ─────────────────────────────────────────────────────────

pub struct IdleBehavior;

impl Behavior<OngoingGameInput, Envo> for IdleBehavior {
    fn on_enter(&self, _t: &Transition, envo: &mut Envo) {
        {
            let mut ctx = envo.context_mut();
            ctx.lifecycle_game_id = None;
            ctx.team_members.clear();
            ctx.gameflow_session = None;
            ctx.champ_select_session = None;
            ctx.teambuilder_payload = None;
            ctx.effective_queue_id = None;
            ctx.summoner_states.clear();
            ctx.history_states.clear();
        }
        broadcast_updated(envo, OngoingGamePhase::Idle);
    }

    fn on_event(
        &self,
        event: &OngoingGameInput,
        _current: &State,
        envo: &mut Envo,
        _tree: &dyn TreeView,
    ) -> EventReply {
        let t = &*ONGOING_TREE;
        match event {
            OngoingGameInput::FocusChanged(change) => {
                if change.current.is_some() {
                    spawn_seed_task(envo);
                }
                EventReply::Handled
            }
            OngoingGameInput::Seeded(seed) => {
                {
                    let mut ctx = envo.context_mut();
                    ctx.gameflow_session = seed.gameflow_session.clone();
                    ctx.champ_select_session = seed.champ_select_session.clone();
                    ctx.teambuilder_payload = seed.teambuilder_payload.clone();
                }
                match seed.phase {
                    GameflowPhase::ChampSelect => {
                        envo.machine.request_transition(t.champ_select, None);
                    }
                    GameflowPhase::InProgress | GameflowPhase::InGame => {
                        envo.machine.request_transition(t.in_game, None);
                    }
                    _ => {}
                }
                EventReply::Handled
            }
            OngoingGameInput::GameflowSessionUpdated(data) => {
                match data.phase {
                    GameflowPhase::ChampSelect => {
                        envo.context_mut().gameflow_session = Some((**data).clone());
                        envo.machine.request_transition(t.champ_select, None);
                    }
                    GameflowPhase::InProgress | GameflowPhase::InGame => {
                        envo.context_mut().gameflow_session = Some((**data).clone());
                        envo.machine.request_transition(t.in_game, None);
                    }
                    _ => {}
                }
                EventReply::Handled
            }
            OngoingGameInput::SetMatchHistoryMode(mode) => {
                envo.context_mut().match_history_mode = mode.clone();
                broadcast_updated(envo, OngoingGamePhase::Idle);
                EventReply::Handled
            }
            _ => EventReply::Ignored,
        }
    }
}

// ── ChampSelectBehavior ──────────────────────────────────────────────────

pub struct ChampSelectBehavior;

impl ChampSelectBehavior {
    fn build_roster(envo: &Envo) {
        let members: Vec<TeamMember> = {
            let ctx = envo.context();
            if let Some(cs) = ctx.champ_select_session.as_ref() {
                // Primary path — champ-select session is the source of truth
                // once LCU has pushed it. my_team already excludes enemies.
                let mut members: Vec<TeamMember> = cs.my_team.to_vec();

                if let Some(tb) = ctx.teambuilder_payload.as_ref() {
                    for member in &mut members {
                        if member.name_visibility_type == NameVisibilityType::HIDDEN
                            && member.puuid.is_empty()
                        {
                            if let Some(cell) = tb
                                .champion_select_state
                                .cells
                                .allied_team
                                .iter()
                                .find(|c| c.cell_id == member.cell_id)
                            {
                                member.puuid = cell.puuid.clone();
                                member.summoner_id = cell.summoner_id;
                                member.game_name = cell.game_name.clone();
                                member.tag_line = cell.tag_line.clone();
                            }
                        }
                    }
                }
                members
            } else if let Some(tb) = ctx.teambuilder_payload.as_ref() {
                // Fallback — champ-select session hasn't been pushed yet.
                // Teambuilder's allied cells carry everything we need for
                // the ally's roster, so the UI can paint cards immediately
                // instead of waiting on the WS tick.
                tb.champion_select_state
                    .cells
                    .allied_team
                    .iter()
                    .map(build_team_member_from_teambuilder_cell)
                    .collect()
            } else {
                return;
            }
        };

        envo.context_mut().team_members = members;
        sync_lifecycle_ids_from_gameflow(envo);
    }
}

impl Behavior<OngoingGameInput, Envo> for ChampSelectBehavior {
    fn on_enter(&self, _t: &Transition, envo: &mut Envo) {
        Self::build_roster(envo);

        if envo.context().champ_select_session.is_some() {
            spawn_all_fetch_tasks(envo);
        } else {
            // Cold start — rely on WS push for champ-select, but seed another state.
            spawn_seed_task(envo);
        }

        broadcast_updated(envo, OngoingGamePhase::ChampSelect);
    }

    fn on_exit(&self, _t: &Transition, envo: &mut Envo) {
        stop_all_tasks(envo);
    }

    fn on_event(
        &self,
        event: &OngoingGameInput,
        current: &State,
        envo: &mut Envo,
        _tree: &dyn TreeView,
    ) -> EventReply {
        let t = &*ONGOING_TREE;
        let phase = phase_of(current);

        if let Some(reply) = try_handle_common_event(envo, phase, event) {
            return reply;
        }

        match event {
            OngoingGameInput::ChampSelectSessionUpdated(data) => {
                envo.context_mut().champ_select_session = Some((**data).clone());
                Self::build_roster(envo);
                spawn_all_fetch_tasks(envo);
                broadcast_updated(envo, phase);
                EventReply::Handled
            }
            OngoingGameInput::TeambuilderTbdGameUpdated(data) => {
                envo.context_mut().teambuilder_payload = Some((**data).clone());
                Self::build_roster(envo);
                spawn_all_fetch_tasks(envo);
                broadcast_updated(envo, phase);
                EventReply::Handled
            }
            OngoingGameInput::GameflowSessionUpdated(data) => {
                envo.context_mut().gameflow_session = Some((**data).clone());
                match data.phase {
                    GameflowPhase::InProgress | GameflowPhase::InGame => {
                        envo.machine.request_transition(t.in_game, None);
                    }
                    GameflowPhase::ChampSelect => {}
                    _ => {
                        envo.machine.request_transition(t.idle, None);
                    }
                }
                EventReply::Handled
            }
            OngoingGameInput::FocusChanged(change) => {
                if change.current.is_none() {
                    envo.machine.request_transition(t.idle, None);
                }
                EventReply::Handled
            }
            OngoingGameInput::Seeded(seed) => {
                {
                    let mut ctx = envo.context_mut();
                    ctx.gameflow_session = seed.gameflow_session.clone();
                    if let Some(cs) = &seed.champ_select_session {
                        ctx.champ_select_session = Some(cs.clone());
                    }
                    if let Some(tb) = &seed.teambuilder_payload {
                        ctx.teambuilder_payload = Some(tb.clone());
                    }
                }
                Self::build_roster(envo);
                spawn_all_fetch_tasks(envo);
                broadcast_updated(envo, phase);
                EventReply::Handled
            }
            _ => EventReply::Ignored,
        }
    }
}

// ── InGameBehavior ───────────────────────────────────────────────────────

pub struct InGameBehavior;

impl InGameBehavior {
    fn build_roster_from_gameflow(envo: &Envo) {
        let members: Vec<TeamMember> = {
            let ctx = envo.context();
            let Some(gs) = ctx.gameflow_session.as_ref() else {
                return;
            };

            let mut members: Vec<TeamMember> = Vec::new();
            for player in &gs.game_data.team_one {
                members.push(build_team_member_from_gameflow(player, 1));
            }
            for player in &gs.game_data.team_two {
                members.push(build_team_member_from_gameflow(player, 2));
            }
            members
        };

        {
            let mut ctx = envo.context_mut();
            ctx.team_members = members;
            ctx.champ_select_session = None;
            ctx.teambuilder_payload = None;
        }
        sync_lifecycle_ids_from_gameflow(envo);
    }
}

fn parse_lane_position(raw: &str) -> LanePosition {
    match raw.trim().to_ascii_lowercase().as_str() {
        "" => LanePosition::None,
        "middle" | "mid" => LanePosition::Middle,
        "top" => LanePosition::Top,
        "bottom" | "bot" | "adc" => LanePosition::Bottom,
        "jungle" | "jg" => LanePosition::Jungle,
        "utility" | "support" | "sup" => LanePosition::Utility,
        "fill" => LanePosition::Fill,
        "afk" => LanePosition::AFK,
        _ => LanePosition::None,
    }
}

fn build_team_member_from_teambuilder_cell(cell: &TeambuilderCell) -> TeamMember {
    TeamMember {
        assigned_position: parse_lane_position(&cell.assigned_position),
        cell_id: cell.cell_id,
        champion_id: cell.champion_id,
        champion_pick_intent: cell.champion_pick_intent,
        game_name: cell.game_name.clone(),
        internal_name: String::new(),
        is_auto_filled: cell.is_autofilled,
        is_humanoid: cell.is_humanoid,
        name_visibility_type: cell.name_visibility_type.into(),
        obfuscate_puuid: String::new(),
        obfuscate_summoner_id: 0,
        pick_mode: 0,
        pick_turn: 0,
        player_alias: String::new(),
        player_type: "player".to_owned(),
        puuid: cell.puuid.clone(),
        selected_skin_id: cell.skin_id,
        spell1_id: cell.spell1_id,
        spell2_id: cell.spell2_id,
        summoner_id: cell.summoner_id,
        tag_line: cell.tag_line.clone(),
        team: if cell.team_id == 0 { 1 } else { cell.team_id },
        ward_skin_id: 0,
    }
}

fn build_team_member_from_gameflow(
    player: &crate::shards::lcu::concepts::gameflow_session::Team,
    team: u64,
) -> TeamMember {
    TeamMember {
        puuid: player.puuid.clone(),
        summoner_id: player.summoner_id as i64,
        team,
        champion_id: player.champion_id,
        assigned_position: player.selected_position,
        game_name: player.summoner_internal_name.clone(),
        internal_name: player.summoner_internal_name.clone(),
        cell_id: 0,
        champion_pick_intent: 0,
        is_auto_filled: false,
        is_humanoid: true,
        name_visibility_type: NameVisibilityType::VISIBLE,
        obfuscate_puuid: String::new(),
        obfuscate_summoner_id: 0,
        pick_mode: 0,
        pick_turn: 0,
        player_alias: String::new(),
        player_type: "player".to_owned(),
        selected_skin_id: 0,
        spell1_id: 0,
        spell2_id: 0,
        tag_line: String::new(),
        ward_skin_id: 0,
    }
}

impl Behavior<OngoingGameInput, Envo> for InGameBehavior {
    fn on_enter(&self, _t: &Transition, envo: &mut Envo) {
        Self::build_roster_from_gameflow(envo);
        spawn_all_fetch_tasks(envo);
        broadcast_updated(envo, OngoingGamePhase::InGame);
    }

    fn on_exit(&self, _t: &Transition, envo: &mut Envo) {
        stop_all_tasks(envo);
    }

    fn on_event(
        &self,
        event: &OngoingGameInput,
        current: &State,
        envo: &mut Envo,
        _tree: &dyn TreeView,
    ) -> EventReply {
        let t = &*ONGOING_TREE;
        let phase = phase_of(current);

        if let Some(reply) = try_handle_common_event(envo, phase, event) {
            return reply;
        }

        match event {
            OngoingGameInput::GameflowSessionUpdated(data) => {
                envo.context_mut().gameflow_session = Some((**data).clone());
                match data.phase {
                    GameflowPhase::InProgress | GameflowPhase::InGame => {}
                    _ => {
                        envo.machine.request_transition(t.idle, None);
                    }
                }
                EventReply::Handled
            }
            OngoingGameInput::FocusChanged(change) => {
                if change.current.is_none() {
                    envo.machine.request_transition(t.idle, None);
                }
                EventReply::Handled
            }
            OngoingGameInput::Seeded(seed) => {
                if let Some(gs) = &seed.gameflow_session {
                    envo.context_mut().gameflow_session = Some(gs.clone());
                }
                Self::build_roster_from_gameflow(envo);
                spawn_all_fetch_tasks(envo);
                broadcast_updated(envo, phase);
                EventReply::Handled
            }
            _ => EventReply::Ignored,
        }
    }
}
