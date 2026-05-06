use maokai_gears::ops::task::TaskHandle;
use maokai_machine::Envelope;
use maokai_runner::{Behavior, EventReply, Transition};
use maokai_tree::{State, TreeView};

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::concepts::champ_select_session::{NameVisibilityType, TeamMember};
use crate::shards::lcu::concepts::gameflow_phase::Phase as GameflowPhase;
use crate::shards::lcu::concepts::matchmaking_ready_check::ReadyCheckState;
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::lcu::concepts::teambuilder_tbd_game::{
    TeambuilderCell, TeambuilderTbdGamePayload,
};
use crate::shards::lcu::concepts::LanePosition;
use crate::shards::sgp::matches::RawMatchSummaryGame;
use crate::shards::sgp::LcuSessionSgpExt;

use super::context::OngoingGameCtx;
use super::tree::{phase_of, ONGOING_TREE};
use super::types::{
    OngoingGameEvent, OngoingGameInput, OngoingGameMatchHistoriesUpdated,
    OngoingGameMatchHistoryState, OngoingGamePhase, OngoingGamePlayerLoadStatus,
    OngoingGameSlotKind, OngoingGameSummonerState, OngoingGameSummonersUpdated,
    OngoingGameTeamMember, OngoingGameUpdated,
};

const BOT_PUUID: &str = "BOT";
const MULTI_TEAM_QUEUE_IDS: &[u64] = &[1700, 1710, 1720, 3140];
const INFERRED_MULTI_TEAM_ID_OFFSET: u64 = 1000;
const MULTI_TEAM_FALLBACK_GROUP_SIZE: usize = 2;

type Envo = Envelope<OngoingGameInput, OngoingGameCtx>;

fn is_bot(puuid: &str) -> bool {
    puuid.is_empty() || puuid == BOT_PUUID
}

fn is_multi_team_queue(queue_id: u64) -> bool {
    MULTI_TEAM_QUEUE_IDS.contains(&queue_id)
}

fn is_explicit_bot_slot(member: &TeamMember) -> bool {
    member.puuid.eq_ignore_ascii_case(BOT_PUUID) || member.player_type.eq_ignore_ascii_case("bot")
}

fn has_player_identity(member: &TeamMember) -> bool {
    !member.puuid.trim().is_empty()
        || member.summoner_id > 0
        || !member.obfuscate_puuid.trim().is_empty()
        || member.obfuscate_summoner_id > 0
        || !member.game_name.trim().is_empty()
        || !member.player_alias.trim().is_empty()
}

fn has_player_selection(member: &TeamMember) -> bool {
    member.champion_id > 0
        || member.champion_pick_intent > 0
        || member.spell1_id > 0
        || member.spell2_id > 0
}

fn is_real_champ_select_slot(member: &TeamMember) -> bool {
    is_explicit_bot_slot(member) || has_player_identity(member) || has_player_selection(member)
}

fn slot_kind_for_team_member(member: &TeamMember) -> OngoingGameSlotKind {
    if is_explicit_bot_slot(member) {
        return OngoingGameSlotKind::Bot;
    }

    if has_player_identity(member) || has_player_selection(member) {
        return OngoingGameSlotKind::Player;
    }

    OngoingGameSlotKind::Placeholder
}

fn ongoing_team_member(member: &TeamMember) -> OngoingGameTeamMember {
    OngoingGameTeamMember::from_lcu_member(member, slot_kind_for_team_member(member))
}

fn transition_target(phase: OngoingGamePhase) -> State {
    let t = &*ONGOING_TREE;
    match phase {
        OngoingGamePhase::Idle => t.idle,
        OngoingGamePhase::Matchmaking => t.matchmaking,
        OngoingGamePhase::ReadyCheck => t.ready_check,
        OngoingGamePhase::ChampSelect => t.champ_select,
        OngoingGamePhase::InGame => t.in_game,
    }
}

fn request_transition(
    current: OngoingGamePhase,
    next: OngoingGamePhase,
    envo: &mut Envo,
    reason: &str,
) {
    if current == next {
        return;
    }

    tracing::info!(
        channel = "ongoing_game",
        from = ?current,
        to = ?next,
        reason,
        "Ongoing lifecycle phase changed"
    );
    envo.machine
        .request_transition(transition_target(next), None);
}

fn derived_phase(envo: &Envo) -> OngoingGamePhase {
    let ctx = envo.context();

    if let Some(session) = ctx.gameflow_session.as_ref() {
        match session.phase {
            GameflowPhase::GameStart | GameflowPhase::InProgress | GameflowPhase::InGame => {
                return OngoingGamePhase::InGame;
            }
            GameflowPhase::ChampSelect => return OngoingGamePhase::ChampSelect,
            GameflowPhase::ReadyCheck => return OngoingGamePhase::ReadyCheck,
            GameflowPhase::Matchmaking => {
                if ctx.ready_check.is_some()
                    || ctx.matchmaking_search.as_ref().is_some_and(|search| {
                        !matches!(search.ready_check.state, ReadyCheckState::Invalid)
                    })
                {
                    return OngoingGamePhase::ReadyCheck;
                }
                return OngoingGamePhase::Matchmaking;
            }
            _ => {}
        }
    }

    if ctx.champ_select_session.is_some() || ctx.teambuilder_payload.is_some() {
        return OngoingGamePhase::ChampSelect;
    }

    if ctx.ready_check.is_some()
        || ctx
            .matchmaking_search
            .as_ref()
            .is_some_and(|search| !matches!(search.ready_check.state, ReadyCheckState::Invalid))
    {
        return OngoingGamePhase::ReadyCheck;
    }

    if ctx.is_matchmaking_search_active() {
        return OngoingGamePhase::Matchmaking;
    }

    OngoingGamePhase::Idle
}

fn request_transition_for_context(current: OngoingGamePhase, envo: &mut Envo, reason: &str) {
    request_transition(current, derived_phase(envo), envo, reason);
}

fn effective_ready_check_clone(
    envo: &Envo,
) -> Option<crate::shards::lcu::concepts::matchmaking_ready_check::MatchmakingReadyCheckData> {
    envo.context().effective_ready_check().cloned()
}

fn broadcast_updated(envo: &Envo, phase: OngoingGamePhase) {
    let ctx = envo.context();

    let champ_select_session = ctx.champ_select_session.as_ref().map(|cs| {
        let mut cs = cs.clone();
        cs.their_team = Vec::new();
        cs.bans.their_team_bans = Vec::new();
        cs
    });

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
        matchmaking_search: ctx.matchmaking_search.clone(),
        ready_check: effective_ready_check_clone(envo),
        champ_select_session,
        team_members: ctx.team_members.iter().map(ongoing_team_member).collect(),
    };
    let channels = ctx.channels.clone();
    drop(ctx);
    channels.broadcast(OngoingGameEvent::Updated(payload));
}

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
        let (lcu, input_tx, game_id) = {
            let ctx = envo.context();
            (
                ctx.lcu_shard.clone(),
                ctx.input_tx.clone(),
                ctx.lifecycle_game_id,
            )
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
            game_id,
        });
    });
    envo.context_mut()
        .summoner_tasks
        .insert(puuid.to_owned(), handle);
}

fn spawn_history_task(envo: &Envo, puuid: &str) {
    let puuid_owned = puuid.to_owned();
    let handle = envo.send().start_task(move |envo| async move {
        let (lcu, sgp, count, tag, input_tx, game_id, history_fetch_semaphore) = {
            let ctx = envo.context();
            (
                ctx.lcu_shard.clone(),
                ctx.sgp_shard.clone(),
                ctx.settings.match_history_count_value(),
                ctx.match_history_mode.effective_tag(ctx.effective_queue_id),
                ctx.input_tx.clone(),
                ctx.lifecycle_game_id,
                ctx.history_fetch_semaphore.clone(),
            )
        };

        let games = async {
            let manager = lcu.manager()?;
            let session = manager.focused().await?;
            let sgp_session = session.to_sgp(&sgp).await.ok()?;
            let permit = history_fetch_semaphore.acquire_owned().await.ok()?;
            let _permit = permit;
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
            game_id,
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

            let (
                phase,
                gameflow_session,
                matchmaking_search,
                ready_check,
                champ_select_session,
                teambuilder_message,
            ) = tokio::join!(
                api.get_gameflow_phase_typed(),
                api.get_gameflow_session_typed_optional(),
                api.get_matchmaking_search_typed_optional(),
                api.get_ready_check_typed_optional(),
                api.get_champ_select_session_typed(),
                api.get_teambuilder_tbd_game_message(),
            );

            let phase = phase.ok()?;

            let gameflow_session = match phase {
                GameflowPhase::Matchmaking
                | GameflowPhase::ReadyCheck
                | GameflowPhase::ChampSelect
                | GameflowPhase::GameStart
                | GameflowPhase::InProgress
                | GameflowPhase::InGame => gameflow_session.ok().flatten(),
                _ => None,
            };

            let (matchmaking_search, ready_check) = if matches!(
                phase,
                GameflowPhase::Matchmaking | GameflowPhase::ReadyCheck
            ) {
                (
                    matchmaking_search.ok().flatten(),
                    ready_check.ok().flatten(),
                )
            } else {
                (None, None)
            };

            let (champ_select_session, teambuilder_payload) =
                if matches!(phase, GameflowPhase::ChampSelect) {
                    (
                        champ_select_session.ok().flatten(),
                        teambuilder_message
                            .ok()
                            .flatten()
                            .map(|message| message.payload),
                    )
                } else {
                    (None, None)
                };

            Some(OngoingSessionSeed {
                gameflow_session,
                matchmaking_search,
                ready_check,
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

fn team_puuids(envo: &Envo) -> Vec<String> {
    envo.context()
        .team_members
        .iter()
        .map(|m| m.puuid.clone())
        .filter(|p| !is_bot(p))
        .collect()
}

fn sync_lifecycle_ids_from_gameflow(envo: &Envo) {
    let (game_id, queue_id) = {
        let ctx = envo.context();
        let game_id = ctx.gameflow_session.as_ref().map(|gs| gs.game_data.game_id);
        let queue_id = ctx
            .gameflow_session
            .as_ref()
            .map(|gs| gs.game_data.queue.id)
            .or_else(|| {
                ctx.matchmaking_search
                    .as_ref()
                    .map(|search| search.queue_id)
            });
        (game_id, queue_id)
    };

    if let Some(game_id) = game_id {
        envo.context_mut().lifecycle_game_id = Some(game_id);
    }
    if let Some(queue_id) = queue_id {
        envo.context_mut().effective_queue_id = Some(queue_id);
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

fn clear_gameplay_context(envo: &Envo) {
    stop_all_tasks(envo);
    {
        let mut ctx = envo.context_mut();
        ctx.lifecycle_game_id = None;
        ctx.effective_queue_id = None;
        ctx.team_members.clear();
        ctx.champ_select_session = None;
        ctx.teambuilder_payload = None;
        ctx.summoner_states.clear();
        ctx.history_states.clear();
    }
}

fn clear_matchmaking_context(envo: &Envo) {
    let mut ctx = envo.context_mut();
    ctx.matchmaking_search = None;
    ctx.ready_check = None;
}

fn clear_champ_select_context(envo: &Envo) {
    let mut ctx = envo.context_mut();
    ctx.champ_select_session = None;
    ctx.teambuilder_payload = None;
}

fn apply_seed(envo: &Envo, seed: &OngoingSessionSeed) {
    {
        let mut ctx = envo.context_mut();
        ctx.gameflow_session = seed.gameflow_session.clone();
        ctx.matchmaking_search = seed.matchmaking_search.clone();
        ctx.ready_check = seed.ready_check.clone();
        ctx.champ_select_session = seed.champ_select_session.clone();
        ctx.teambuilder_payload = seed.teambuilder_payload.clone();
    }
    sync_lifecycle_ids_from_gameflow(envo);
}

struct SummonerInfoSlot(SummonerInfo);

fn handle_summoner_loaded(
    envo: &Envo,
    phase: OngoingGamePhase,
    puuid: &str,
    info: &Option<Box<SummonerInfo>>,
    game_id: Option<u64>,
) -> EventReply {
    if envo.context().lifecycle_game_id != game_id {
        envo.context_mut().summoner_tasks.remove(puuid);
        return EventReply::Handled;
    }

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
    game_id: Option<u64>,
) -> EventReply {
    if envo.context().lifecycle_game_id != game_id {
        envo.context_mut().history_tasks.remove(puuid);
        return EventReply::Handled;
    }

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

fn try_handle_gameplay_common_event(
    envo: &Envo,
    phase: OngoingGamePhase,
    event: &OngoingGameInput,
) -> Option<EventReply> {
    match event {
        OngoingGameInput::SummonerLoaded {
            puuid,
            info,
            game_id,
        } => Some(handle_summoner_loaded(envo, phase, puuid, info, *game_id)),
        OngoingGameInput::MatchHistoryLoaded {
            puuid,
            games,
            game_id,
        } => Some(handle_match_history_loaded(
            envo, phase, puuid, games, *game_id,
        )),
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

fn try_handle_pre_game_common_event(
    envo: &Envo,
    phase: OngoingGamePhase,
    event: &OngoingGameInput,
) -> Option<EventReply> {
    match event {
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

fn handle_focus_change(
    current_phase: OngoingGamePhase,
    envo: &mut Envo,
    change: &crate::shards::lcu::manager::FocusChange,
) -> EventReply {
    envo.context_mut().current_focus_pid = change.current;
    if change.current.is_none() {
        request_transition(current_phase, OngoingGamePhase::Idle, envo, "focus cleared");
        return EventReply::Handled;
    }

    request_transition(current_phase, OngoingGamePhase::Idle, envo, "focus changed");
    spawn_seed_task(envo);
    EventReply::Handled
}

pub struct IdleBehavior;

impl Behavior<OngoingGameInput, Envo> for IdleBehavior {
    fn on_enter(&self, _t: &Transition, envo: &mut Envo) {
        stop_all_tasks(envo);
        {
            let mut ctx = envo.context_mut();
            ctx.lifecycle_game_id = None;
            ctx.team_members.clear();
            ctx.gameflow_session = None;
            ctx.matchmaking_search = None;
            ctx.ready_check = None;
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
        match event {
            OngoingGameInput::FocusChanged(change) => {
                envo.context_mut().current_focus_pid = change.current;
                if change.current.is_some() {
                    spawn_seed_task(envo);
                }
                EventReply::Handled
            }
            OngoingGameInput::Seeded(seed) => {
                apply_seed(envo, seed);
                request_transition_for_context(OngoingGamePhase::Idle, envo, "seeded");
                EventReply::Handled
            }
            OngoingGameInput::GameflowSessionUpdated(data) => {
                envo.context_mut().gameflow_session = Some((**data).clone());
                sync_lifecycle_ids_from_gameflow(envo);
                request_transition_for_context(OngoingGamePhase::Idle, envo, "gameflow updated");
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchUpdated(data) => {
                envo.context_mut().matchmaking_search = Some((**data).clone());
                sync_lifecycle_ids_from_gameflow(envo);
                request_transition_for_context(OngoingGamePhase::Idle, envo, "search updated");
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchDeleted => {
                envo.context_mut().matchmaking_search = None;
                request_transition_for_context(OngoingGamePhase::Idle, envo, "search deleted");
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckUpdated(data) => {
                envo.context_mut().ready_check = Some((**data).clone());
                request_transition_for_context(OngoingGamePhase::Idle, envo, "ready check updated");
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckDeleted => {
                envo.context_mut().ready_check = None;
                request_transition_for_context(OngoingGamePhase::Idle, envo, "ready check deleted");
                EventReply::Handled
            }
            OngoingGameInput::ChampSelectSessionUpdated(data) => {
                envo.context_mut().champ_select_session = Some((**data).clone());
                request_transition_for_context(
                    OngoingGamePhase::Idle,
                    envo,
                    "champ select updated",
                );
                EventReply::Handled
            }
            OngoingGameInput::TeambuilderTbdGameUpdated(data) => {
                envo.context_mut().teambuilder_payload = Some((**data).clone());
                request_transition_for_context(OngoingGamePhase::Idle, envo, "teambuilder updated");
                EventReply::Handled
            }
            OngoingGameInput::SetMatchHistoryMode(mode) => {
                envo.context_mut().match_history_mode = mode.clone();
                broadcast_updated(envo, OngoingGamePhase::Idle);
                EventReply::Handled
            }
            OngoingGameInput::Refresh => {
                spawn_seed_task(envo);
                EventReply::Handled
            }
            _ => EventReply::Ignored,
        }
    }
}

pub struct MatchmakingBehavior;

impl Behavior<OngoingGameInput, Envo> for MatchmakingBehavior {
    fn on_enter(&self, _t: &Transition, envo: &mut Envo) {
        clear_gameplay_context(envo);
        envo.context_mut().ready_check = None;
        sync_lifecycle_ids_from_gameflow(envo);
        broadcast_updated(envo, OngoingGamePhase::Matchmaking);
    }

    fn on_event(
        &self,
        event: &OngoingGameInput,
        _current: &State,
        envo: &mut Envo,
        _tree: &dyn TreeView,
    ) -> EventReply {
        if let Some(reply) =
            try_handle_pre_game_common_event(envo, OngoingGamePhase::Matchmaking, event)
        {
            return reply;
        }

        match event {
            OngoingGameInput::FocusChanged(change) => {
                handle_focus_change(OngoingGamePhase::Matchmaking, envo, change)
            }
            OngoingGameInput::Seeded(seed) => {
                apply_seed(envo, seed);
                request_transition_for_context(OngoingGamePhase::Matchmaking, envo, "seeded");
                broadcast_updated(envo, OngoingGamePhase::Matchmaking);
                EventReply::Handled
            }
            OngoingGameInput::GameflowSessionUpdated(data) => {
                envo.context_mut().gameflow_session = Some((**data).clone());
                sync_lifecycle_ids_from_gameflow(envo);
                request_transition_for_context(
                    OngoingGamePhase::Matchmaking,
                    envo,
                    "gameflow updated",
                );
                broadcast_updated(envo, OngoingGamePhase::Matchmaking);
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchUpdated(data) => {
                envo.context_mut().matchmaking_search = Some((**data).clone());
                sync_lifecycle_ids_from_gameflow(envo);
                request_transition_for_context(
                    OngoingGamePhase::Matchmaking,
                    envo,
                    "search updated",
                );
                broadcast_updated(envo, OngoingGamePhase::Matchmaking);
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchDeleted => {
                envo.context_mut().matchmaking_search = None;
                request_transition_for_context(
                    OngoingGamePhase::Matchmaking,
                    envo,
                    "search deleted",
                );
                broadcast_updated(envo, OngoingGamePhase::Matchmaking);
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckUpdated(data) => {
                envo.context_mut().ready_check = Some((**data).clone());
                request_transition_for_context(
                    OngoingGamePhase::Matchmaking,
                    envo,
                    "ready check updated",
                );
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckDeleted => {
                envo.context_mut().ready_check = None;
                request_transition_for_context(
                    OngoingGamePhase::Matchmaking,
                    envo,
                    "ready check deleted",
                );
                EventReply::Handled
            }
            OngoingGameInput::ChampSelectSessionUpdated(data) => {
                envo.context_mut().champ_select_session = Some((**data).clone());
                request_transition_for_context(
                    OngoingGamePhase::Matchmaking,
                    envo,
                    "champ select updated",
                );
                EventReply::Handled
            }
            OngoingGameInput::TeambuilderTbdGameUpdated(data) => {
                envo.context_mut().teambuilder_payload = Some((**data).clone());
                request_transition_for_context(
                    OngoingGamePhase::Matchmaking,
                    envo,
                    "teambuilder updated",
                );
                EventReply::Handled
            }
            _ => EventReply::Ignored,
        }
    }
}

pub struct ReadyCheckBehavior;

impl Behavior<OngoingGameInput, Envo> for ReadyCheckBehavior {
    fn on_enter(&self, _t: &Transition, envo: &mut Envo) {
        clear_gameplay_context(envo);
        sync_lifecycle_ids_from_gameflow(envo);
        broadcast_updated(envo, OngoingGamePhase::ReadyCheck);
    }

    fn on_event(
        &self,
        event: &OngoingGameInput,
        _current: &State,
        envo: &mut Envo,
        _tree: &dyn TreeView,
    ) -> EventReply {
        if let Some(reply) =
            try_handle_pre_game_common_event(envo, OngoingGamePhase::ReadyCheck, event)
        {
            return reply;
        }

        match event {
            OngoingGameInput::FocusChanged(change) => {
                handle_focus_change(OngoingGamePhase::ReadyCheck, envo, change)
            }
            OngoingGameInput::Seeded(seed) => {
                apply_seed(envo, seed);
                request_transition_for_context(OngoingGamePhase::ReadyCheck, envo, "seeded");
                broadcast_updated(envo, OngoingGamePhase::ReadyCheck);
                EventReply::Handled
            }
            OngoingGameInput::GameflowSessionUpdated(data) => {
                envo.context_mut().gameflow_session = Some((**data).clone());
                sync_lifecycle_ids_from_gameflow(envo);
                request_transition_for_context(
                    OngoingGamePhase::ReadyCheck,
                    envo,
                    "gameflow updated",
                );
                broadcast_updated(envo, OngoingGamePhase::ReadyCheck);
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchUpdated(data) => {
                envo.context_mut().matchmaking_search = Some((**data).clone());
                sync_lifecycle_ids_from_gameflow(envo);
                request_transition_for_context(
                    OngoingGamePhase::ReadyCheck,
                    envo,
                    "search updated",
                );
                broadcast_updated(envo, OngoingGamePhase::ReadyCheck);
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchDeleted => {
                envo.context_mut().matchmaking_search = None;
                request_transition_for_context(
                    OngoingGamePhase::ReadyCheck,
                    envo,
                    "search deleted",
                );
                broadcast_updated(envo, OngoingGamePhase::ReadyCheck);
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckUpdated(data) => {
                envo.context_mut().ready_check = Some((**data).clone());
                request_transition_for_context(
                    OngoingGamePhase::ReadyCheck,
                    envo,
                    "ready check updated",
                );
                broadcast_updated(envo, OngoingGamePhase::ReadyCheck);
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckDeleted => {
                envo.context_mut().ready_check = None;
                request_transition_for_context(
                    OngoingGamePhase::ReadyCheck,
                    envo,
                    "ready check deleted",
                );
                broadcast_updated(envo, OngoingGamePhase::ReadyCheck);
                EventReply::Handled
            }
            OngoingGameInput::ChampSelectSessionUpdated(data) => {
                envo.context_mut().champ_select_session = Some((**data).clone());
                request_transition_for_context(
                    OngoingGamePhase::ReadyCheck,
                    envo,
                    "champ select updated",
                );
                EventReply::Handled
            }
            OngoingGameInput::TeambuilderTbdGameUpdated(data) => {
                envo.context_mut().teambuilder_payload = Some((**data).clone());
                request_transition_for_context(
                    OngoingGamePhase::ReadyCheck,
                    envo,
                    "teambuilder updated",
                );
                EventReply::Handled
            }
            _ => EventReply::Ignored,
        }
    }
}

pub struct ChampSelectBehavior;

impl ChampSelectBehavior {
    fn build_roster(envo: &Envo) {
        let members: Vec<TeamMember> = {
            let ctx = envo.context();
            build_champ_select_roster(
                ctx.champ_select_session.as_ref(),
                ctx.teambuilder_payload.as_ref(),
            )
        };

        envo.context_mut().team_members = members;
        sync_lifecycle_ids_from_gameflow(envo);
    }
}

impl Behavior<OngoingGameInput, Envo> for ChampSelectBehavior {
    fn on_enter(&self, _t: &Transition, envo: &mut Envo) {
        clear_matchmaking_context(envo);
        Self::build_roster(envo);

        if envo.context().champ_select_session.is_some() {
            spawn_all_fetch_tasks(envo);
        } else {
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
        let phase = phase_of(current);

        if let Some(reply) = try_handle_gameplay_common_event(envo, phase, event) {
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
                let prev_queue_id = envo.context().effective_queue_id;
                envo.context_mut().gameflow_session = Some((**data).clone());
                match data.phase {
                    GameflowPhase::GameStart
                    | GameflowPhase::InProgress
                    | GameflowPhase::InGame => {
                        request_transition(
                            phase,
                            OngoingGamePhase::InGame,
                            envo,
                            "gameflow moved in game",
                        );
                    }
                    GameflowPhase::ChampSelect => {
                        sync_lifecycle_ids_from_gameflow(envo);
                        if envo.context().effective_queue_id != prev_queue_id {
                            stop_history_tasks(envo);
                            restart_history_tasks(envo);
                            broadcast_updated(envo, phase);
                        }
                    }
                    _ => {
                        clear_champ_select_context(envo);
                        request_transition_for_context(
                            phase,
                            envo,
                            "gameflow moved away from champ select",
                        );
                    }
                }
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchUpdated(data) => {
                envo.context_mut().matchmaking_search = Some((**data).clone());
                request_transition_for_context(phase, envo, "search updated");
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchDeleted => {
                envo.context_mut().matchmaking_search = None;
                request_transition_for_context(phase, envo, "search deleted");
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckUpdated(data) => {
                envo.context_mut().ready_check = Some((**data).clone());
                request_transition_for_context(phase, envo, "ready check updated");
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckDeleted => {
                envo.context_mut().ready_check = None;
                request_transition_for_context(phase, envo, "ready check deleted");
                EventReply::Handled
            }
            OngoingGameInput::FocusChanged(change) => handle_focus_change(phase, envo, change),
            OngoingGameInput::Seeded(seed) => {
                apply_seed(envo, seed);
                Self::build_roster(envo);
                spawn_all_fetch_tasks(envo);
                broadcast_updated(envo, phase);
                EventReply::Handled
            }
            _ => EventReply::Ignored,
        }
    }
}

pub struct InGameBehavior;

impl InGameBehavior {
    fn build_roster_from_gameflow(envo: &Envo) {
        let members: Vec<TeamMember> = {
            let ctx = envo.context();
            let Some(gs) = ctx.gameflow_session.as_ref() else {
                return;
            };

            let preserved = ctx.team_members.clone();
            let (team_one_side, team_two_side) = resolve_gameflow_team_sides(
                &preserved,
                &gs.game_data.team_one,
                &gs.game_data.team_two,
            );

            let mut members: Vec<TeamMember> = Vec::new();
            for (index, player) in gs.game_data.team_one.iter().enumerate() {
                let team = resolve_gameflow_team_for_player(
                    gs.game_data.queue.id,
                    gs.game_data.team_two.is_empty(),
                    gs.game_data.team_one.len(),
                    index,
                    team_one_side,
                );
                members.push(build_team_member_from_gameflow(player, team));
            }
            for player in &gs.game_data.team_two {
                members.push(build_team_member_from_gameflow(player, team_two_side));
            }

            let ally_side = preserved.first().map(|m| m.team).unwrap_or(team_two_side);
            append_preserved_members(&mut members, &preserved, ally_side);

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

fn backfill_member_from_teambuilder(member: &mut TeamMember, cell: &TeambuilderCell) {
    if member.puuid.is_empty() {
        member.puuid = cell.puuid.clone();
    }
    if member.summoner_id == 0 {
        member.summoner_id = cell.summoner_id;
    }
    if member.game_name.is_empty() {
        member.game_name = cell.game_name.clone();
    }
    if member.tag_line.is_empty() {
        member.tag_line = cell.tag_line.clone();
    }
    if member.champion_id == 0 {
        member.champion_id = cell.champion_id;
    }
    if member.champion_pick_intent == 0 {
        member.champion_pick_intent = cell.champion_pick_intent;
    }
    if member.spell1_id == 0 {
        member.spell1_id = cell.spell1_id;
    }
    if member.spell2_id == 0 {
        member.spell2_id = cell.spell2_id;
    }
}

fn build_champ_select_roster(
    champ_select: Option<
        &crate::shards::lcu::concepts::champ_select_session::ChampSelectSessionData,
    >,
    teambuilder: Option<&TeambuilderTbdGamePayload>,
) -> Vec<TeamMember> {
    let should_filter_empty_slots = champ_select
        .map(|cs| is_multi_team_queue(cs.queue_id))
        .or_else(|| teambuilder.map(|tb| is_multi_team_queue(tb.queue_id)))
        .unwrap_or(false);

    let mut members = if let Some(cs) = champ_select {
        let mut members: Vec<TeamMember> = cs.my_team.to_vec();

        if let Some(tb) = teambuilder {
            for member in &mut members {
                if member.name_visibility_type != NameVisibilityType::HIDDEN
                    || !member.puuid.is_empty()
                {
                    continue;
                }

                if let Some(cell) = tb
                    .champion_select_state
                    .cells
                    .allied_team
                    .iter()
                    .find(|cell| cell.cell_id == member.cell_id)
                {
                    backfill_member_from_teambuilder(member, cell);
                }
            }
        }

        members
    } else if let Some(tb) = teambuilder {
        tb.champion_select_state
            .cells
            .allied_team
            .iter()
            .map(build_team_member_from_teambuilder_cell)
            .collect()
    } else {
        Vec::new()
    };

    if should_filter_empty_slots {
        members.retain(is_real_champ_select_slot);
    }

    members
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

fn append_preserved_members(
    members: &mut Vec<TeamMember>,
    preserved: &[TeamMember],
    ally_side: u64,
) {
    for entry in preserved {
        if entry.puuid.is_empty() || !is_real_champ_select_slot(entry) {
            continue;
        }

        let already_present = members.iter().any(|member| member.puuid == entry.puuid);
        if already_present {
            continue;
        }

        let mut clone = entry.clone();
        clone.team = ally_side;
        members.push(clone);
    }
}

fn side_pair(team: u64) -> Option<(u64, u64)> {
    match team {
        1 => Some((1, 2)),
        2 => Some((2, 1)),
        100 => Some((100, 200)),
        200 => Some((200, 100)),
        _ => None,
    }
}

fn lookup_preserved_team(preserved: &[TeamMember], puuid: &str) -> Option<u64> {
    if puuid.is_empty() {
        return None;
    }
    preserved.iter().find(|m| m.puuid == puuid).map(|m| m.team)
}

fn resolve_gameflow_team_sides(
    preserved: &[TeamMember],
    team_one: &[crate::shards::lcu::concepts::gameflow_session::Team],
    team_two: &[crate::shards::lcu::concepts::gameflow_session::Team],
) -> (u64, u64) {
    for player in team_one {
        if let Some(team) = lookup_preserved_team(preserved, &player.puuid) {
            if let Some(pair) = side_pair(team) {
                return pair;
            }
        }
    }

    for player in team_two {
        if let Some(team) = lookup_preserved_team(preserved, &player.puuid) {
            if let Some((self_side, other_side)) = side_pair(team) {
                return (other_side, self_side);
            }
        }
    }

    (100, 200)
}

fn resolve_gameflow_team_for_player(
    queue_id: u64,
    single_lcu_team: bool,
    team_size: usize,
    player_index: usize,
    fallback_team: u64,
) -> u64 {
    if is_multi_team_queue(queue_id)
        && single_lcu_team
        && team_size > MULTI_TEAM_FALLBACK_GROUP_SIZE
    {
        return INFERRED_MULTI_TEAM_ID_OFFSET
            + (player_index / MULTI_TEAM_FALLBACK_GROUP_SIZE) as u64
            + 1;
    }

    fallback_team
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
        clear_matchmaking_context(envo);
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
        let phase = phase_of(current);

        if let Some(reply) = try_handle_gameplay_common_event(envo, phase, event) {
            return reply;
        }

        match event {
            OngoingGameInput::GameflowSessionUpdated(data) => {
                envo.context_mut().gameflow_session = Some((**data).clone());
                match data.phase {
                    GameflowPhase::GameStart
                    | GameflowPhase::InProgress
                    | GameflowPhase::InGame => {}
                    _ => {
                        request_transition_for_context(phase, envo, "gameflow moved out of game");
                    }
                }
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchUpdated(data) => {
                envo.context_mut().matchmaking_search = Some((**data).clone());
                request_transition_for_context(phase, envo, "search updated");
                EventReply::Handled
            }
            OngoingGameInput::MatchmakingSearchDeleted => {
                envo.context_mut().matchmaking_search = None;
                request_transition_for_context(phase, envo, "search deleted");
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckUpdated(data) => {
                envo.context_mut().ready_check = Some((**data).clone());
                request_transition_for_context(phase, envo, "ready check updated");
                EventReply::Handled
            }
            OngoingGameInput::ReadyCheckDeleted => {
                envo.context_mut().ready_check = None;
                request_transition_for_context(phase, envo, "ready check deleted");
                EventReply::Handled
            }
            OngoingGameInput::FocusChanged(change) => handle_focus_change(phase, envo, change),
            OngoingGameInput::Seeded(seed) => {
                apply_seed(envo, seed);
                Self::build_roster_from_gameflow(envo);
                spawn_all_fetch_tasks(envo);
                broadcast_updated(envo, phase);
                EventReply::Handled
            }
            _ => EventReply::Ignored,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::shards::lcu::concepts::champ_select_session::ChampSelectSessionData;
    use crate::shards::lcu::concepts::teambuilder_tbd_game::{
        PhaseName, Subphase, TeambuilderCells, TeambuilderChampionSelectState,
        TeambuilderTbdGamePayload,
    };

    fn hidden_member(cell_id: u64) -> TeamMember {
        TeamMember {
            cell_id,
            name_visibility_type: NameVisibilityType::HIDDEN,
            team: 1,
            ..Default::default()
        }
    }

    fn visible_member(cell_id: u64, puuid: &str, summoner_id: i64) -> TeamMember {
        TeamMember {
            cell_id,
            puuid: puuid.to_owned(),
            summoner_id,
            team: 1,
            ..Default::default()
        }
    }

    fn teambuilder_cell(cell_id: u64, puuid: &str, summoner_id: i64) -> TeambuilderCell {
        TeambuilderCell {
            cell_id,
            puuid: puuid.to_owned(),
            summoner_id,
            team_id: 1,
            spell1_id: 2201,
            spell2_id: 2202,
            ..Default::default()
        }
    }

    fn teambuilder_payload(cells: Vec<TeambuilderCell>) -> TeambuilderTbdGamePayload {
        TeambuilderTbdGamePayload {
            counter: 1,
            phase_name: PhaseName::CHAMPION_SELECT,
            queue_id: 1700,
            game_id: 500_753_580_850,
            context_id: "context".to_owned(),
            champion_select_state: TeambuilderChampionSelectState {
                team_id: "team".to_owned(),
                team_chat_room_id: "chat".to_owned(),
                subphase: Subphase::BAN_PICK,
                cells: TeambuilderCells {
                    allied_team: cells,
                    enemy_team: Vec::new(),
                },
                local_player_cell_id: 11,
            },
            request_guid: "request".to_owned(),
        }
    }

    #[test]
    fn arena_champ_select_roster_keeps_only_real_allied_slots() {
        let mut session = ChampSelectSessionData {
            queue_id: 1700,
            local_player_cell_id: 11,
            my_team: (0..16).map(hidden_member).collect(),
            ..Default::default()
        };
        session.my_team[10] = hidden_member(10);
        session.my_team[10].obfuscate_summoner_id = 6_739_234_566_349;
        session.my_team[11] = visible_member(
            11,
            "3e7ba79d-87e7-52c9-a034-3746e1a8ca02",
            3_515_302_757_346_176,
        );
        let payload = teambuilder_payload(vec![
            teambuilder_cell(
                10,
                "0ed18ac1-a1dd-05ad-2480-db364054a3e0",
                6_739_234_566_349,
            ),
            teambuilder_cell(
                11,
                "3e7ba79d-87e7-52c9-a034-3746e1a8ca02",
                3_515_302_757_346_176,
            ),
        ]);

        let roster = build_champ_select_roster(Some(&session), Some(&payload));

        assert_eq!(roster.len(), 2);
        assert_eq!(
            roster
                .iter()
                .map(|member| member.cell_id)
                .collect::<Vec<_>>(),
            vec![10, 11]
        );
        assert!(roster.iter().all(|member| !member.puuid.is_empty()));
    }

    #[test]
    fn preserved_empty_champ_select_slots_are_not_appended_to_ingame_roster() {
        let mut members = vec![TeamMember {
            puuid: "live-player".to_owned(),
            summoner_id: 42,
            team: 100,
            ..Default::default()
        }];
        let preserved = vec![
            hidden_member(0),
            TeamMember {
                puuid: "live-player".to_owned(),
                summoner_id: 42,
                team: 1,
                ..Default::default()
            },
            TeamMember {
                puuid: "queued-ally".to_owned(),
                summoner_id: 43,
                team: 1,
                ..Default::default()
            },
        ];

        append_preserved_members(&mut members, &preserved, 100);

        assert_eq!(
            members
                .iter()
                .map(|member| member.puuid.as_str())
                .collect::<Vec<_>>(),
            vec!["live-player", "queued-ally"]
        );
    }

    #[test]
    fn slot_kind_distinguishes_players_bots_and_placeholders() {
        let mut hidden_player = hidden_member(3);
        hidden_player.obfuscate_summoner_id = 123;
        assert_eq!(
            slot_kind_for_team_member(&hidden_player),
            OngoingGameSlotKind::Player
        );

        let mut selected_hidden_player = hidden_member(4);
        selected_hidden_player.champion_id = 33;
        selected_hidden_player.spell1_id = 2201;
        selected_hidden_player.spell2_id = 2202;
        assert_eq!(
            slot_kind_for_team_member(&selected_hidden_player),
            OngoingGameSlotKind::Player
        );

        let mut bot = hidden_member(5);
        bot.player_type = "BOT".to_owned();
        assert_eq!(slot_kind_for_team_member(&bot), OngoingGameSlotKind::Bot);

        assert_eq!(
            slot_kind_for_team_member(&hidden_member(6)),
            OngoingGameSlotKind::Placeholder
        );
    }

    #[test]
    fn arena_gameflow_fallback_assigns_two_player_team_ids() {
        let team_ids = (0..16)
            .map(|index| resolve_gameflow_team_for_player(1700, true, 16, index, 100))
            .collect::<Vec<_>>();

        assert_eq!(
            team_ids,
            vec![
                1001, 1001, 1002, 1002, 1003, 1003, 1004, 1004, 1005, 1005, 1006, 1006, 1007, 1007,
                1008, 1008
            ]
        );
        assert_eq!(resolve_gameflow_team_for_player(420, true, 10, 0, 100), 100);
    }
}
