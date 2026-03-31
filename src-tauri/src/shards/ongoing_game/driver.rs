use std::sync::{Arc, LazyLock};

use maokai_runner::{Behavior, Behaviors, EventReply, Runner};
use maokai_tree::{DataView, State, StateTree, TreeView};

use crate::shards::lcu::events::gameflow_phase::Phase;
use crate::shards::lcu::events::LcuWsEvent;
use crate::shards::lcu::session::LcuSession;
use crate::shards::ongoing_game::manager::{ManagerState, OngoingGameContext};
use crate::shards::ongoing_game::types::{
    OngoingGameEvent, OngoingGameMatchHistoriesUpdated, OngoingGamePhase,
    OngoingGameSummonersUpdated,
};
use crate::shards::sgp::session::SgpSession;

type DriverInput = LcuWsEvent;

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
        behaviors.register(idle, IdleBehavior { ctx: ctx.clone() });
        behaviors.register(champ_select, ChampSelectBehavior { ctx: ctx.clone() });
        behaviors.register(in_game, InGameBehavior { ctx });

        Self {
            current: tree.root(),
            runner: Runner::new(tree),
            behaviors,
        }
    }

    pub fn process(&mut self, event: &LcuWsEvent) -> Option<OngoingGamePhase> {
        let previous = self.current.clone();
        self.current = self.runner.dispatch(&self.behaviors, &self.current, event);

        if self.current != previous {
            let prev = Self::phase(&previous);
            let next = Self::phase(&self.current);
            tracing::info!("OngoingGame phase: {prev:?} -> {next:?}");
            Some(next)
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

// ---------------------------------------------------------------------------
// Idle
// ---------------------------------------------------------------------------

struct IdleBehavior {
    ctx: Arc<OngoingGameContext>,
}

impl Behavior<DriverInput> for IdleBehavior {
    fn on_enter(&self, _state: &State) {
        let ctx = self.ctx.clone();
        tokio::spawn(async move {
            let mut state = ctx.state.lock().await;
            state.clear_caches();
            let updated = state.build_updated_payload(&ctx.settings);
            drop(state);
            ctx.broadcast(OngoingGameEvent::Updated(updated));
        });
    }

    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match event {
            LcuWsEvent::ChampSelectSession(_) => transition_to(OngoingGamePhase::ChampSelect),
            LcuWsEvent::GameflowSession(payload) => match payload.data.phase {
                Phase::ChampSelect => transition_to(OngoingGamePhase::ChampSelect),
                Phase::InProgress | Phase::GameStart | Phase::InGame => {
                    transition_to(OngoingGamePhase::InGame)
                }
                _ => EventReply::Ignored,
            },
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
        let ctx = self.ctx.clone();
        tokio::spawn(async move {
            let (updated, new_puuids, new_history_puuids, lcu, sgp, count, tag) = {
                let state = ctx.state.lock().await;

                let updated = state.build_updated_payload(&ctx.settings);
                let new_puuids = state.new_puuids();
                let new_history_puuids = state.new_history_puuids();
                let lcu = state.lcu_session.clone();
                let sgp = state.sgp_session.clone();
                let count = ctx.settings.match_history_count_value();
                let tag = ctx.settings.match_history_tag_value();
                (
                    updated,
                    new_puuids,
                    new_history_puuids,
                    lcu,
                    sgp,
                    count,
                    tag,
                )
            };

            ctx.broadcast(OngoingGameEvent::Updated(updated));

            spawn_per_player_fetches(
                &ctx,
                &lcu,
                &sgp,
                &new_puuids,
                &new_history_puuids,
                count,
                tag.as_deref(),
            );
        });
    }

    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match event {
            LcuWsEvent::ChampSelectSession(cs) => {
                let ctx = self.ctx.clone();
                let data = cs.data.clone();
                tokio::spawn(async move {
                    let (updated, new_puuids, new_history_puuids, lcu, sgp, count, tag) = {
                        let mut state = ctx.state.lock().await;
                        state.cached_champ_select_session = Some(data.clone());
                        state.cached_team_members = ManagerState::extract_champ_select_members(&data);

                        let updated = state.build_updated_payload(&ctx.settings);
                        let new_puuids = state.new_puuids();
                        let new_history_puuids = state.new_history_puuids();
                        let lcu = state.lcu_session.clone();
                        let sgp = state.sgp_session.clone();
                        let count = ctx.settings.match_history_count_value();
                        let tag = ctx.settings.match_history_tag_value();
                        (
                            updated,
                            new_puuids,
                            new_history_puuids,
                            lcu,
                            sgp,
                            count,
                            tag,
                        )
                    };

                    ctx.broadcast(OngoingGameEvent::Updated(updated));
                    spawn_per_player_fetches(
                        &ctx,
                        &lcu,
                        &sgp,
                        &new_puuids,
                        &new_history_puuids,
                        count,
                        tag.as_deref(),
                    );
                });
                EventReply::Handled
            }
            LcuWsEvent::GameflowSession(payload) => match payload.data.phase {
                Phase::InProgress | Phase::GameStart | Phase::InGame => {
                    transition_to(OngoingGamePhase::InGame)
                }
                Phase::None | Phase::Lobby | Phase::WaitingForStats | Phase::TerminatedInError => {
                    transition_to(OngoingGamePhase::Idle)
                }
                _ => EventReply::Handled,
            },
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
        let ctx = self.ctx.clone();
        tokio::spawn(async move {
            let (updated, new_puuids, new_history_puuids, lcu, sgp, count, tag) = {
                let state = ctx.state.lock().await;

                let updated = state.build_updated_payload(&ctx.settings);
                let new_puuids = state.new_puuids();
                let new_history_puuids = state.new_history_puuids();
                let lcu = state.lcu_session.clone();
                let sgp = state.sgp_session.clone();
                let count = ctx.settings.match_history_count_value();
                let tag = ctx.settings.match_history_tag_value();
                (
                    updated,
                    new_puuids,
                    new_history_puuids,
                    lcu,
                    sgp,
                    count,
                    tag,
                )
            };

            ctx.broadcast(OngoingGameEvent::Updated(updated));

            spawn_per_player_fetches(
                &ctx,
                &lcu,
                &sgp,
                &new_puuids,
                &new_history_puuids,
                count,
                tag.as_deref(),
            );
        });
    }

    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match event {
            LcuWsEvent::GameflowSession(payload) => match payload.data.phase {
                Phase::EndOfGame
                | Phase::None
                | Phase::Lobby
                | Phase::WaitingForStats
                | Phase::TerminatedInError => transition_to(OngoingGamePhase::Idle),
                _ => {
                    let ctx = self.ctx.clone();
                    let data = payload.data.clone();
                    tokio::spawn(async move {
                        let (updated, new_puuids, new_history_puuids, lcu, sgp, count, tag) = {
                            let mut state = ctx.state.lock().await;
                            state.cached_gameflow_session = Some(data.clone());
                            state.cached_team_members = ManagerState::extract_gameflow_members(&data);

                            let updated = state.build_updated_payload(&ctx.settings);
                            let new_puuids = state.new_puuids();
                            let new_history_puuids = state.new_history_puuids();
                            let lcu = state.lcu_session.clone();
                            let sgp = state.sgp_session.clone();
                            let count = ctx.settings.match_history_count_value();
                            let tag = ctx.settings.match_history_tag_value();
                            (
                                updated,
                                new_puuids,
                                new_history_puuids,
                                lcu,
                                sgp,
                                count,
                                tag,
                            )
                        };

                        ctx.broadcast(OngoingGameEvent::Updated(updated));
                        spawn_per_player_fetches(
                            &ctx,
                            &lcu,
                            &sgp,
                            &new_puuids,
                            &new_history_puuids,
                            count,
                            tag.as_deref(),
                        );
                    });
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

/// Spawns one task per player (summoner and history in parallel per player).
fn spawn_per_player_fetches(
    ctx: &Arc<OngoingGameContext>,
    lcu: &Option<Arc<LcuSession>>,
    sgp: &Option<Arc<SgpSession>>,
    summoner_puuids: &[String],
    history_puuids: &[String],
    history_count: u32,
    tag: Option<&str>,
) {
    let all_puuids: std::collections::HashSet<&String> = summoner_puuids
        .iter()
        .chain(history_puuids.iter())
        .collect();

    for puuid in all_puuids {
        let ctx = ctx.clone();
        let puuid = puuid.clone();
        let lcu = lcu.clone();
        let sgp = sgp.clone();
        let needs_summoner = summoner_puuids.contains(&puuid);
        let needs_history = history_puuids.contains(&puuid);
        let tag = tag.map(|t| t.to_owned());

        tokio::spawn(async move {
            let summoner_fut = async {
                if !needs_summoner {
                    return;
                }
                let Some(ref lcu) = lcu else { return };
                let Ok(summoner) = lcu.api().get_summoner_by_puuid(&puuid).await else {
                    return;
                };

                let mut state = ctx.state.lock().await;
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
                fetch_single_history(&ctx, &sgp, &puuid, history_count, tag.as_deref()).await;
            };

            tokio::join!(summoner_fut, history_fut);
        });
    }
}

/// Public: spawns history-only fetches for given puuids (used by manager for tag change / refresh).
pub fn spawn_per_player_history_fetches(
    ctx: &Arc<OngoingGameContext>,
    sgp: &Option<Arc<SgpSession>>,
    puuids: &[String],
    count: u32,
    tag: Option<&str>,
) {
    for puuid in puuids {
        let ctx = ctx.clone();
        let puuid = puuid.clone();
        let sgp = sgp.clone();
        let tag = tag.map(|t| t.to_owned());

        tokio::spawn(async move {
            fetch_single_history(&ctx, &sgp, &puuid, count, tag.as_deref()).await;
        });
    }
}

async fn fetch_single_history(
    ctx: &Arc<OngoingGameContext>,
    sgp: &Option<Arc<SgpSession>>,
    puuid: &str,
    count: u32,
    tag: Option<&str>,
) {
    let Some(ref sgp) = sgp else { return };
    let Ok(resp) = sgp
        .api()
        .get_match_summaries(puuid, 0, count, tag, None)
        .await
    else {
        return;
    };

    let mut state = ctx.state.lock().await;
    state
        .cached_match_histories
        .insert(puuid.to_owned(), resp.games);
    let phase = state
        .driver
        .as_ref()
        .map(|d| d.current_phase())
        .unwrap_or(OngoingGamePhase::Idle);
    let all_histories = state.cached_match_histories.clone();
    drop(state);

    ctx.broadcast(OngoingGameEvent::MatchHistoriesUpdated(
        OngoingGameMatchHistoriesUpdated {
            phase,
            match_histories: all_histories,
        },
    ));
}

