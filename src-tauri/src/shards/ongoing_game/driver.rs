use std::sync::LazyLock;

use maokai_runner::{Behavior, Behaviors, EventReply, Runner};
use maokai_tree::{DataView, State, StateTree, TreeView};

use crate::shards::ongoing_game::types::OngoingGamePhase;
use crate::shards::lcu::watcher::LcuWsEvent;
use crate::shards::lcu::ws_event_types::parse_gameflow_phase_event;

type DriverInput = String;

// ---------------------------------------------------------------------------
// State tree
// ---------------------------------------------------------------------------

/// (tree, champ_select, in_game)
/// Idle is the root state.
static ONGOING_GAME_TREE: LazyLock<(StateTree<OngoingGamePhase>, State, State, State)> =
    LazyLock::new(|| {
        let mut tree = StateTree::new(OngoingGamePhase::Idle);
        let idle = tree.root();
        let champ_select = tree.add_child(&idle, OngoingGamePhase::ChampSelect);
        let in_game = tree.add_child(&idle, OngoingGamePhase::InGame);
        (tree, idle, champ_select, in_game)
    });

// ---------------------------------------------------------------------------
// Driver - pure synchronous state machine
// ---------------------------------------------------------------------------

pub struct OngoingGameDriver {
    current: State,
    runner: Runner<'static, OngoingGamePhase>,
    behaviors: Behaviors<'static, DriverInput>,
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

    /// Feed a WS event into the state machine. Returns `Some(new_phase)` on
    /// transition, `None` if the phase did not change.
    pub fn process(&mut self, event: &LcuWsEvent) -> Option<OngoingGamePhase> {
        let Some(payload) = parse_gameflow_phase_event(event) else {
            return None;
        };

        let previous = self.current.clone();
        self.current = self
            .runner
            .dispatch(&self.behaviors, &self.current, &payload.phase);

        if self.current != previous {
            let prev = Self::phase(&previous);
            let next = Self::phase(&self.current);
            tracing::info!("OngoingGame phase: {prev:?} -> {next:?}");
            Some(next)
        } else {
            None
        }
    }

    fn phase(state: &State) -> OngoingGamePhase {
        ONGOING_GAME_TREE
            .0
            .get_data(state)
            .copied()
            .unwrap_or(OngoingGamePhase::Idle)
    }

    pub fn current_phase(&self) -> OngoingGamePhase {
        Self::phase(&self.current)
    }

    /// Force-set the phase (e.g., after querying get_gameflow_phase on startup).
    /// Returns `Some(phase)` if the phase actually changed.
    pub fn force_phase(&mut self, phase: OngoingGamePhase) -> Option<OngoingGamePhase> {
        let handle = handle_for_phase(phase);
        if handle == self.current {
            return None;
        }
        self.current = handle;
        Some(phase)
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

fn phase_from_input(input: &DriverInput) -> &str {
    input.as_str()
}

// ---------------------------------------------------------------------------
// Behaviors
// ---------------------------------------------------------------------------

struct IdleBehavior;

impl Behavior<DriverInput> for IdleBehavior {
    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match phase_from_input(event) {
            "ChampSelect" => transition_to(OngoingGamePhase::ChampSelect),
            _ => EventReply::Ignored,
        }
    }
}

struct ChampSelectBehavior;

impl Behavior<DriverInput> for ChampSelectBehavior {
    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match phase_from_input(event) {
            "InProgress" | "GameStart" => transition_to(OngoingGamePhase::InGame),
            "None" | "Lobby" | "WaitingForStats" | "TerminatedInError" => {
                transition_to(OngoingGamePhase::Idle)
            }
            _ => EventReply::Handled,
        }
    }
}

struct InGameBehavior;

impl Behavior<DriverInput> for InGameBehavior {
    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match phase_from_input(event) {
            "EndOfGame" | "None" | "Lobby" | "WaitingForStats" | "TerminatedInError" => {
                transition_to(OngoingGamePhase::Idle)
            }
            _ => EventReply::Handled,
        }
    }
}


