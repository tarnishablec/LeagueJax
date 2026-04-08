use std::sync::{Arc, LazyLock};

use maokai_runner::{Behavior, Behaviors, EventReply, Runner, Transition};
use maokai_tree::{DataView, State, StateTree, TreeView};

use super::context::OngoingGameContext;
use super::types::OngoingGamePhase;

use crate::shards::lcu::concepts::gameflow_phase::Phase;
use crate::shards::lcu::concepts::LcuWsEvent;

type DriverInput = LcuWsEvent;
type DriverCtx = Arc<OngoingGameContext>;

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
    behaviors: Behaviors<'static, DriverInput, DriverCtx>,
}

impl OngoingGameDriver {
    pub fn new() -> Self {
        let (tree, idle, champ_select, in_game) = &*ONGOING_GAME_TREE;

        let mut behaviors = Behaviors::default();
        behaviors.register(idle, IdleBehavior);
        behaviors.register(champ_select, ChampSelectBehavior);
        behaviors.register(in_game, InGameBehavior);

        Self {
            current: tree.root(),
            runner: Runner::new(tree),
            behaviors,
        }
    }

    pub fn process(
        &mut self,
        event: &LcuWsEvent,
        ctx: &mut DriverCtx,
    ) -> Option<(OngoingGamePhase, OngoingGamePhase)> {
        let previous = self.current.clone();
        self.current = self
            .runner
            .dispatch(&self.behaviors, &self.current, event, ctx);

        if self.current != previous {
            Some((Self::phase(&previous), Self::phase(&self.current)))
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

impl Default for OngoingGameDriver {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Transition helpers (retained for future use)
// ---------------------------------------------------------------------------

#[allow(dead_code)]
fn handle_for_phase(phase: OngoingGamePhase) -> State {
    let (_, _, champ_select, in_game) = &*ONGOING_GAME_TREE;
    match phase {
        OngoingGamePhase::ChampSelect => champ_select.clone(),
        OngoingGamePhase::InGame => in_game.clone(),
        OngoingGamePhase::Idle => ONGOING_GAME_TREE.0.root(),
    }
}

#[allow(dead_code)]
fn transition_to(target: OngoingGamePhase) -> EventReply {
    EventReply::Transition(handle_for_phase(target))
}

#[allow(dead_code)]
fn transition_from_phase_in_idle(phase: Phase) -> EventReply {
    match phase {
        Phase::ChampSelect => transition_to(OngoingGamePhase::ChampSelect),
        Phase::InProgress | Phase::GameStart | Phase::InGame => {
            transition_to(OngoingGamePhase::InGame)
        }
        _ => EventReply::Ignored,
    }
}

#[allow(dead_code)]
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

#[allow(dead_code)]
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
// Behaviors (skeleton — WS handling intentionally omitted)
// ---------------------------------------------------------------------------

struct IdleBehavior;

impl Behavior<DriverInput, DriverCtx> for IdleBehavior {
    fn on_enter(&self, _transition: &Transition, _ctx: &mut DriverCtx) {
        tracing::info!("[ongoing_game] entered Idle");
        // TODO: reset ongoing state snapshot
    }

    fn on_event(
        &self,
        _event: &DriverInput,
        _current: &State,
        _ctx: &mut DriverCtx,
        _tree: &dyn TreeView,
    ) -> EventReply {
        // TODO: dispatch by event kind; previously:
        //   LcuWsEvent::GameflowPhase(p) => transition_from_phase_in_idle(p.data),
        //   LcuWsEvent::ChampSelectSession(_) => transition_to(OngoingGamePhase::ChampSelect),
        //   LcuWsEvent::GameflowSession(p) => transition_from_phase_in_idle(p.data.phase),
        EventReply::Ignored
    }
}

struct ChampSelectBehavior;

impl Behavior<DriverInput, DriverCtx> for ChampSelectBehavior {
    fn on_enter(&self, _transition: &Transition, _ctx: &mut DriverCtx) {
        tracing::info!("[ongoing_game] entered ChampSelect");
        // TODO: spawn player fetch via ctx.clone()
    }

    fn on_event(
        &self,
        _event: &DriverInput,
        _current: &State,
        _ctx: &mut DriverCtx,
        _tree: &dyn TreeView,
    ) -> EventReply {
        // TODO: dispatch by event kind; previously:
        //   LcuWsEvent::GameflowPhase(p)      => transition_from_phase_in_champ_select(p.data),
        //   LcuWsEvent::GameflowSession(p)    => transition_from_phase_in_champ_select(p.data.phase),
        //   LcuWsEvent::ChampSelectSession(_) => refresh players,
        //   LcuWsEvent::TeambuilderTbdGame(_) => refresh players,
        EventReply::Handled
    }
}

struct InGameBehavior;

impl Behavior<DriverInput, DriverCtx> for InGameBehavior {
    fn on_enter(&self, _transition: &Transition, _ctx: &mut DriverCtx) {
        tracing::info!("[ongoing_game] entered InGame");
        // TODO: spawn player fetch via ctx.clone()
    }

    fn on_event(
        &self,
        _event: &DriverInput,
        _current: &State,
        _ctx: &mut DriverCtx,
        _tree: &dyn TreeView,
    ) -> EventReply {
        // TODO: dispatch by event kind; previously:
        //   LcuWsEvent::GameflowPhase(p)   => transition_from_phase_in_game(p.data),
        //   LcuWsEvent::GameflowSession(p) => match end-phases -> Idle else refresh,
        EventReply::Handled
    }
}
