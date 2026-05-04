use maokai_gears::ops::task::TaskHandle;
use maokai_machine::Envelope;
use maokai_runner::{Behavior, EventReply, Transition};
use maokai_tree::{State, TreeView};

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::concepts::champ_select_session::{NameVisibilityType, TeamMember};
use crate::shards::lcu::concepts::gameflow_phase::Phase as GameflowPhase;
use crate::shards::lcu::concepts::matchmaking_ready_check::ReadyCheckState;
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

fn is_bot(puuid: &str) -> bool {
    puuid.is_empty() || puuid == BOT_PUUID
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
        team_members: ctx.team_members.clone(),
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
            if let Some(cs) = ctx.champ_select_session.as_ref() {
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
            for player in &gs.game_data.team_one {
                members.push(build_team_member_from_gameflow(player, team_one_side));
            }
            for player in &gs.game_data.team_two {
                members.push(build_team_member_from_gameflow(player, team_two_side));
            }

            let ally_side = preserved.first().map(|m| m.team).unwrap_or(team_two_side);
            for entry in &preserved {
                let already_present =
                    !entry.puuid.is_empty() && members.iter().any(|m| m.puuid == entry.puuid);
                if already_present {
                    continue;
                }
                let mut clone = entry.clone();
                clone.team = ally_side;
                members.push(clone);
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
