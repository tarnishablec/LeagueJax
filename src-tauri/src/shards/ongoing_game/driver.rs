use std::sync::{Arc, LazyLock};

use maokai_runner::{Behavior, Behaviors, EventReply, Runner};
use maokai_tree::{DataView, State, StateTree, TreeView};

use crate::shards::lcu::events::gameflow_phase::Phase;
use crate::shards::lcu::events::LcuWsEvent;
use crate::shards::lcu::session::LcuSession;
use crate::shards::ongoing_game::manager::OngoingGameContext;
use crate::shards::ongoing_game::types::{
    OngoingGameEvent, OngoingGameMatchHistoriesUpdated, OngoingGamePhase,
    OngoingGameSummonersUpdated, OngoingGameUpdated,
};
use crate::shards::sgp::session::SgpSession;
use crate::shards::sgp::LcuSessionSgpExt;

type DriverInput = LcuWsEvent;

fn event_name(event: &DriverInput) -> &'static str {
    match event {
        LcuWsEvent::GameflowPhase(_) => "GameflowPhase",
        LcuWsEvent::ChampSelectSession(_) => "ChampSelectSession",
        LcuWsEvent::GameflowSession(_) => "GameflowSession",
        LcuWsEvent::TeambuilderTbdGame(_) => "TeambuilderTbdGame",
        _ => "Other",
    }
}

struct PlayerFetchSnapshot {
    generation: u64,
    lifecycle_game_id: Option<u64>,
    updated: OngoingGameUpdated,
    new_puuids: Vec<String>,
    new_history_puuids: Vec<String>,
    history_fetch_started: bool,
    lcu: Option<Arc<LcuSession>>,
    history_count: u32,
    effective_queue_id: Option<u64>,
    raw_tag: Option<String>,
    effective_tag: Option<String>,
}

// ---------------------------------------------------------------------------
// State tree
// ---------------------------------------------------------------------------

static ONGOING_GAME_TREE: LazyLock<(StateTree<OngoingGamePhase>, State, State, State)> =
    LazyLock::new(|| {
        let mut tree = StateTree::new(OngoingGamePhase::Idle);
        let idle = tree.root();
        let champ_select = tree.add_child(&idle, OngoingGamePhase::ChampSelect);
        let in_game = tree.add_child(&idle, OngoingGamePhase::InGame);
        (tree, idle, champ_select, in_game)
    });

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

pub struct OngoingGameDriver {
    current: State,
    runner: Runner<'static, OngoingGamePhase>,
    behaviors: Behaviors<'static, DriverInput>,
}

impl OngoingGameDriver {
    pub fn new(ctx: Arc<OngoingGameContext>) -> Self {
        let (tree, idle, champ_select, in_game) = &*ONGOING_GAME_TREE;

        let mut behaviors = Behaviors::default();
        behaviors.register(idle, IdleBehavior);
        behaviors.register(champ_select, ChampSelectBehavior { ctx: ctx.clone() });
        behaviors.register(in_game, InGameBehavior { ctx });

        Self {
            current: tree.root(),
            runner: Runner::new(tree),
            behaviors,
        }
    }

    pub fn process(&mut self, event: &LcuWsEvent) -> Option<(OngoingGamePhase, OngoingGamePhase)> {
        let previous = self.current.clone();
        self.current = self.runner.dispatch(&self.behaviors, &self.current, event);

        if self.current != previous {
            let prev = Self::phase(&previous);
            let next = Self::phase(&self.current);
            Some((prev, next))
        } else {
            None
        }
    }

    pub fn current_phase(&self) -> OngoingGamePhase {
        Self::phase(&self.current)
    }

    fn phase(state: &State) -> OngoingGamePhase {
        ONGOING_GAME_TREE
            .0
            .get_data(state)
            .copied()
            .unwrap_or(OngoingGamePhase::Idle)
    }
}

fn handle_for_phase(phase: OngoingGamePhase) -> State {
    let (_, _, champ_select, in_game) = &*ONGOING_GAME_TREE;
    match phase {
        OngoingGamePhase::ChampSelect => champ_select.clone(),
        OngoingGamePhase::InGame => in_game.clone(),
        OngoingGamePhase::Idle => ONGOING_GAME_TREE.0.root(),
    }
}

fn transition_to(target: OngoingGamePhase) -> EventReply {
    EventReply::Transition(handle_for_phase(target))
}

fn transition_from_phase_in_idle(phase: Phase) -> EventReply {
    match phase {
        Phase::ChampSelect => transition_to(OngoingGamePhase::ChampSelect),
        Phase::InProgress | Phase::GameStart | Phase::InGame => {
            transition_to(OngoingGamePhase::InGame)
        }
        _ => EventReply::Ignored,
    }
}

fn transition_from_phase_in_champ_select(phase: Phase) -> EventReply {
    match phase {
        Phase::InProgress | Phase::GameStart | Phase::InGame => {
            transition_to(OngoingGamePhase::InGame)
        }
        Phase::EndOfGame
        | Phase::None
        | Phase::Lobby
        | Phase::WaitingForStats
        | Phase::TerminatedInError => transition_to(OngoingGamePhase::Idle),
        _ => EventReply::Handled,
    }
}

fn transition_from_phase_in_game(phase: Phase) -> EventReply {
    match phase {
        Phase::ChampSelect => transition_to(OngoingGamePhase::ChampSelect),
        Phase::EndOfGame
        | Phase::None
        | Phase::Lobby
        | Phase::WaitingForStats
        | Phase::TerminatedInError => transition_to(OngoingGamePhase::Idle),
        _ => EventReply::Handled,
    }
}

// ---------------------------------------------------------------------------
// Idle
// ---------------------------------------------------------------------------

struct IdleBehavior;

impl Behavior<DriverInput> for IdleBehavior {
    fn on_enter(&self, _state: &State) {
        tracing::info!("[ongoing_game] entered Idle");
    }

    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match event {
            LcuWsEvent::GameflowPhase(payload) => transition_from_phase_in_idle(payload.data),
            LcuWsEvent::ChampSelectSession(_) => transition_to(OngoingGamePhase::ChampSelect),
            LcuWsEvent::GameflowSession(payload) => {
                transition_from_phase_in_idle(payload.data.phase)
            }
            _ => EventReply::Ignored,
        }
    }
}

// ---------------------------------------------------------------------------
// ChampSelect
// ---------------------------------------------------------------------------

struct ChampSelectBehavior {
    ctx: Arc<OngoingGameContext>,
}

impl Behavior<DriverInput> for ChampSelectBehavior {
    fn on_enter(&self, _state: &State) {
        tracing::info!("[ongoing_game] entered ChampSelect");
        spawn_fetch_for_missing_members(self.ctx.clone());
    }

    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match event {
            LcuWsEvent::GameflowPhase(payload) => {
                transition_from_phase_in_champ_select(payload.data)
            }
            LcuWsEvent::ChampSelectSession(_) => {
                let ctx = self.ctx.clone();
                tracing::info!(
                    "[ongoing_game] ChampSelect refresh triggered by {}",
                    event_name(event)
                );
                tokio::spawn(refresh_players_from_current_state(ctx));
                EventReply::Handled
            }
            LcuWsEvent::TeambuilderTbdGame(_) => {
                let ctx = self.ctx.clone();
                tracing::info!(
                    "[ongoing_game] ChampSelect refresh triggered by {}",
                    event_name(event)
                );
                tokio::spawn(refresh_players_from_current_state(ctx));
                EventReply::Handled
            }
            LcuWsEvent::GameflowSession(payload) => {
                transition_from_phase_in_champ_select(payload.data.phase)
            }
            _ => EventReply::Handled,
        }
    }
}

// ---------------------------------------------------------------------------
// InGame
// ---------------------------------------------------------------------------

struct InGameBehavior {
    ctx: Arc<OngoingGameContext>,
}

impl Behavior<DriverInput> for InGameBehavior {
    fn on_enter(&self, _state: &State) {
        tracing::info!("[ongoing_game] entered InGame");
        spawn_fetch_for_missing_members(self.ctx.clone());
    }

    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match event {
            LcuWsEvent::GameflowPhase(payload) => transition_from_phase_in_game(payload.data),
            LcuWsEvent::GameflowSession(payload) => match payload.data.phase {
                Phase::EndOfGame
                | Phase::None
                | Phase::Lobby
                | Phase::WaitingForStats
                | Phase::TerminatedInError => transition_to(OngoingGamePhase::Idle),
                _ => {
                    let ctx = self.ctx.clone();
                    tracing::info!(
                        "[ongoing_game] InGame refresh triggered by {}",
                        event_name(event)
                    );
                    tokio::spawn(refresh_players_from_current_state(ctx));
                    EventReply::Handled
                }
            },
            _ => EventReply::Handled,
        }
    }
}

// ---------------------------------------------------------------------------
// Per-player parallel fetch
// ---------------------------------------------------------------------------

fn spawn_fetch_for_missing_members(ctx: Arc<OngoingGameContext>) {
    tokio::spawn(refresh_players_from_current_state(ctx));
}

async fn collect_player_fetch_snapshot(ctx: &Arc<OngoingGameContext>) -> PlayerFetchSnapshot {
    let mut state = ctx.state.lock().await;
    let new_puuids = state.new_puuids();
    let new_history_puuids = if state.match_histories_pending {
        Vec::new()
    } else {
        state.new_history_puuids()
    };
    let history_fetch_started = !new_history_puuids.is_empty();
    if history_fetch_started {
        state.match_histories_pending = true;
    }
    let updated = state.build_updated_payload(&ctx.settings);

    PlayerFetchSnapshot {
        generation: state.generation,
        lifecycle_game_id: state.lifecycle_game_id,
        updated: updated.clone(),
        new_puuids,
        new_history_puuids,
        history_fetch_started,
        lcu: state.lcu_session.clone(),
        history_count: ctx.settings.match_history_count_value(),
        effective_queue_id: updated.effective_queue_id,
        raw_tag: updated.match_history_tag,
        effective_tag: updated.effective_mode_tag,
    }
}

async fn refresh_players_from_current_state(ctx: Arc<OngoingGameContext>) {
    let snapshot = collect_player_fetch_snapshot(&ctx).await;
    tracing::info!(
        "[ongoing_game] refresh snapshot phase={:?} generation={} lifecycle_game_id={:?} team_members={} missing_summoners={} missing_histories={} raw_tag={:?} effective_queue_id={:?} effective_tag={:?} history_count={}",
        snapshot.updated.phase,
        snapshot.generation,
        snapshot.lifecycle_game_id,
        snapshot.updated.team_members.len(),
        snapshot.new_puuids.len(),
        snapshot.new_history_puuids.len(),
        snapshot.raw_tag,
        snapshot.effective_queue_id,
        snapshot.effective_tag,
        snapshot.history_count
    );
    tracing::debug!(
        "[ongoing_game] refresh snapshot missing_summoner_puuids={:?} missing_history_puuids={:?}",
        snapshot.new_puuids,
        snapshot.new_history_puuids
    );
    ctx.broadcast(OngoingGameEvent::Updated(snapshot.updated));

    spawn_per_player_fetches(
        &ctx,
        &snapshot.lcu,
        &snapshot.new_puuids,
        &snapshot.new_history_puuids,
        snapshot.history_count,
        snapshot.effective_tag.as_deref(),
        snapshot.generation,
    )
    .await;

    if snapshot.history_fetch_started {
        let updated = {
            let mut state = ctx.state.lock().await;
            if state.generation == snapshot.generation {
                state.match_histories_pending = false;
            }
            state.build_updated_payload(&ctx.settings)
        };
        tracing::info!(
            "[ongoing_game] history fetch batch completed generation={} lifecycle_game_id={:?} missing_histories_started={}",
            snapshot.generation,
            snapshot.lifecycle_game_id,
            snapshot.new_history_puuids.len()
        );
        ctx.broadcast(OngoingGameEvent::Updated(updated));
    }
}

/// Spawns one task per player (summoner and history in parallel per player).
async fn spawn_per_player_fetches(
    ctx: &Arc<OngoingGameContext>,
    lcu: &Option<Arc<LcuSession>>,
    summoner_puuids: &[String],
    history_puuids: &[String],
    history_count: u32,
    tag: Option<&str>,
    generation: u64,
) {
    let all_puuids: std::collections::HashSet<&String> = summoner_puuids
        .iter()
        .chain(history_puuids.iter())
        .collect();

    if all_puuids.is_empty() {
        tracing::info!(
            "[ongoing_game] no missing puuids for generation={}, nothing to fetch",
            generation
        );
        return;
    }

    let sgp = match lcu {
        Some(lcu_session) => match lcu_session.to_sgp(&ctx.sgp_shard).await {
            Ok(sgp) => Some(sgp),
            Err(error) => {
                tracing::warn!(
                    "[ongoing_game] history fetch setup failed generation={} pid={} error={}",
                    generation,
                    lcu_session.auth().pid,
                    error
                );
                None
            }
        },
        None => None,
    };

    let mut join_set = tokio::task::JoinSet::new();
    for puuid in all_puuids {
        let ctx = ctx.clone();
        let puuid = puuid.clone();
        let lcu = lcu.clone();
        let sgp = sgp.clone();
        let needs_summoner = summoner_puuids.contains(&puuid);
        let needs_history = history_puuids.contains(&puuid);
        let tag = tag.map(|t| t.to_owned());

        join_set.spawn(async move {
            let summoner_fut = async {
                if !needs_summoner {
                    return;
                }
                tracing::info!(
                    "[ongoing_game] summoner fetch start puuid={} generation={}",
                    puuid,
                    generation
                );
                let Some(ref lcu) = lcu else {
                    tracing::warn!(
                        "[ongoing_game] summoner fetch skipped puuid={} generation={} reason=no_lcu_session",
                        puuid,
                        generation
                    );
                    return;
                };
                let summoner = match lcu.api().get_summoner_by_puuid_optional(&puuid).await {
                    Ok(Some(summoner)) => summoner,
                    Ok(None) => {
                        tracing::info!(
                            "[ongoing_game] summoner fetch unavailable puuid={} generation={} reason=not_found",
                            puuid,
                            generation
                        );

                        let mut state = ctx.state.lock().await;
                        if state.generation == generation {
                            state.unavailable_summoner_puuids.insert(puuid.clone());
                        }
                        return;
                    }
                    Err(error) => {
                        tracing::warn!(
                            "[ongoing_game] summoner fetch failed puuid={} generation={} error={}",
                            puuid,
                            generation,
                            error
                        );
                        return;
                    }
                };

                let mut state = ctx.state.lock().await;
                if state.generation != generation {
                    tracing::warn!(
                        "[ongoing_game] summoner fetch dropped puuid={} request_generation={} current_generation={}",
                        puuid,
                        generation,
                        state.generation
                    );
                    return;
                }
                state
                    .cached_summoners_by_puuid
                    .insert(summoner.puuid.clone(), summoner);
                let phase = state
                    .driver
                    .as_ref()
                    .map(|d| d.current_phase())
                    .unwrap_or(OngoingGamePhase::Idle);
                let all_summoners: Vec<_> =
                    state.cached_summoners_by_puuid.values().cloned().collect();
                drop(state);
                tracing::info!(
                    "[ongoing_game] summoner fetch success puuid={} generation={} cached_summoners={}",
                    puuid,
                    generation,
                    all_summoners.len()
                );

                ctx.broadcast(OngoingGameEvent::SummonersUpdated(
                    OngoingGameSummonersUpdated {
                        phase,
                        summoners: all_summoners,
                    },
                ));
            };

            let history_fut = async {
                if !needs_history {
                    return;
                }
                tracing::info!(
                    "[ongoing_game] history fetch start puuid={} generation={} tag={:?} count={}",
                    puuid,
                    generation,
                    tag,
                    history_count
                );
                fetch_single_history(
                    &ctx,
                    &sgp,
                    &puuid,
                    history_count,
                    tag.as_deref(),
                    generation,
                )
                .await;
            };

            tokio::join!(summoner_fut, history_fut);
        });
    }

    while let Some(joined) = join_set.join_next().await {
        if let Err(error) = joined {
            tracing::warn!(
                "[ongoing_game] per-player fetch task join failed generation={} error={}",
                generation,
                error
            );
        }
    }
}

async fn fetch_single_history(
    ctx: &Arc<OngoingGameContext>,
    sgp: &Option<Arc<SgpSession>>,
    puuid: &str,
    count: u32,
    tag: Option<&str>,
    generation: u64,
) {
    let Some(ref sgp) = sgp else {
        tracing::warn!(
            "[ongoing_game] history fetch skipped puuid={} generation={} reason=no_sgp_session",
            puuid,
            generation
        );
        upsert_history_bucket(
            ctx,
            puuid,
            Vec::new(),
            generation,
            "skipped(no_sgp_session)",
        )
        .await;
        return;
    };
    let resp = match sgp
        .api()
        .get_match_summaries(puuid, 0, count, tag, None)
        .await
    {
        Ok(resp) => resp,
        Err(error) => {
            tracing::warn!(
                "[ongoing_game] history fetch failed puuid={} generation={} tag={:?} count={} error={}",
                puuid,
                generation,
                tag,
                count,
                error
            );
            upsert_history_bucket(ctx, puuid, Vec::new(), generation, "failed").await;
            return;
        }
    };

    tracing::info!(
        "[ongoing_game] history fetch success puuid={} generation={} games={}",
        puuid,
        generation,
        resp.games.len()
    );
    upsert_history_bucket(ctx, puuid, resp.games, generation, "success").await;
}

async fn upsert_history_bucket(
    ctx: &Arc<OngoingGameContext>,
    puuid: &str,
    games: Vec<crate::shards::sgp::matches::RawMatchSummaryGame>,
    generation: u64,
    outcome: &str,
) {
    let game_count = games.len();
    let mut state = ctx.state.lock().await;
    if state.generation != generation {
        tracing::warn!(
            "[ongoing_game] history fetch dropped puuid={} request_generation={} current_generation={} outcome={}",
            puuid,
            generation,
            state.generation,
            outcome
        );
        return;
    }

    state.cached_match_histories.insert(puuid.to_owned(), games);
    let phase = state
        .driver
        .as_ref()
        .map(|d| d.current_phase())
        .unwrap_or(OngoingGamePhase::Idle);
    let all_histories = state.cached_match_histories.clone();
    drop(state);

    tracing::info!(
        "[ongoing_game] broadcasting MatchHistoriesUpdated puuid={} generation={} cached_history_puuids={} latest_games={} outcome={}",
        puuid,
        generation,
        all_histories.len(),
        game_count,
        outcome
    );

    ctx.broadcast(OngoingGameEvent::MatchHistoriesUpdated(
        OngoingGameMatchHistoriesUpdated {
            phase,
            match_histories: all_histories,
        },
    ));
}
