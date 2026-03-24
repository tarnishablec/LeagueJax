use std::sync::{Arc, LazyLock, Mutex};

use maokai_runner::{Behavior, Behaviors, EventReply, Runner};
use maokai_tree::{State, StateTree, TreeView};
use tauri::Emitter;
use tokio::sync::broadcast;
use tokio_util::sync::CancellationToken;

use crate::concepts::ongoing_game::{OngoingGamePhase, OngoingGamePhaseChanged};
use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::watcher::LcuWsEvent;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

type DriverInput = LcuWsEvent;

// ---------------------------------------------------------------------------
// State tree
// ---------------------------------------------------------------------------

/// (tree, champ_select, in_game)
/// Idle is the root state — no separate handle needed.
static ONGOING_GAME_TREE: LazyLock<(StateTree<OngoingGamePhase>, State, State)> =
    LazyLock::new(|| {
        let mut tree = StateTree::new(OngoingGamePhase::Idle);
        let root = tree.root();
        let champ_select = tree.add_child(&root, OngoingGamePhase::ChampSelect);
        let in_game = tree.add_child(&root, OngoingGamePhase::InGame);
        (tree, champ_select, in_game)
    });

// ---------------------------------------------------------------------------
// Driver (public wrapper)
// ---------------------------------------------------------------------------

pub struct OngoingGameDriver {
    inner: Arc<DriverInner>,
}

impl OngoingGameDriver {
    pub fn new(
        lcu_session: Arc<LcuSession>,
        app: tauri::AppHandle,
        mut event_rx: broadcast::Receiver<LcuWsEvent>,
        cancel_token: CancellationToken,
    ) -> Self {
        let (_, champ_select, in_game) = &*ONGOING_GAME_TREE;

        let mut behaviors = Behaviors::default();
        behaviors.register(&ONGOING_GAME_TREE.0.root(), IdleBehavior);
        behaviors.register(champ_select, ChampSelectBehavior);
        behaviors.register(in_game, InGameBehavior);

        let inner = Arc::new(DriverInner {
            lcu_session,
            app,
            phase: Mutex::new(OngoingGamePhase::Idle),
            behaviors,
            cancel_token: cancel_token.clone(),
        });

        // Spawn the run loop
        let inner_clone = inner.clone();
        tokio::spawn(async move {
            tokio::select! {
                _ = cancel_token.cancelled() => {}
                _ = inner_clone.run(&mut event_rx) => {}
            }
        });

        Self { inner }
    }

    pub fn phase(&self) -> OngoingGamePhase {
        self.inner
            .phase
            .lock()
            .ok()
            .map(|g| *g)
            .unwrap_or(OngoingGamePhase::Idle)
    }
}

impl Drop for OngoingGameDriver {
    fn drop(&mut self) {
        self.inner.cancel_token.cancel();
    }
}

// ---------------------------------------------------------------------------
// Driver inner
// ---------------------------------------------------------------------------

struct DriverInner {
    lcu_session: Arc<LcuSession>,
    app: tauri::AppHandle,
    phase: Mutex<OngoingGamePhase>,
    behaviors: Behaviors<'static, DriverInput>,
    cancel_token: CancellationToken,
}

impl DriverInner {
    async fn run(self: &Arc<Self>, event_rx: &mut broadcast::Receiver<LcuWsEvent>) {
        // On startup, query the current gameflow phase to catch up
        self.seed_initial_phase().await;

        loop {
            let event = tokio::select! {
                _ = self.cancel_token.cancelled() => break,
                result = event_rx.recv() => {
                    match result {
                        Ok(ev) => ev,
                        Err(broadcast::error::RecvError::Lagged(n)) => {
                            tracing::warn!("OngoingGame driver lagged, skipped {n} events");
                            continue;
                        }
                        Err(broadcast::error::RecvError::Closed) => break,
                    }
                }
            };

            // Only care about gameflow-phase events
            if event.uri != "/lol-gameflow/v1/gameflow-phase" {
                continue;
            }

            let previous = self.current_phase();
            let next = self.dispatch(&event);
            self.apply_side_effects(previous, next, &event);
        }
    }

    /// Query the current gameflow phase on driver start — handles the case where
    /// the user is already in champ select or in the game when the shard starts.
    async fn seed_initial_phase(self: &Arc<Self>) {
        let phase_str = match self.lcu_session.api().get_gameflow_phase().await {
            Ok(s) => s,
            Err(e) => {
                tracing::debug!("Failed to seed gameflow phase: {e}");
                return;
            }
        };

        let target = match phase_str.as_str() {
            "ChampSelect" => OngoingGamePhase::ChampSelect,
            "InProgress" | "InGame" => OngoingGamePhase::InGame,
            _ => return, // Already Idle, nothing to do
        };

        if let Ok(mut lock) = self.phase.lock() {
            *lock = target;
        }

        self.emit_phase_changed(target);
        self.spawn_fetch_for_phase(target);
    }

    // -- State machine dispatch -----------------------------------------------

    fn dispatch(&self, event: &DriverInput) -> OngoingGamePhase {
        let current_handle = self.state_handle_for(self.current_phase());
        let (tree, _, _) = &*ONGOING_GAME_TREE;
        let runner = Runner::new(tree);
        let next_handle = runner.dispatch(&self.behaviors, &current_handle, event);
        self.phase_from_handle(next_handle)
    }

    fn state_handle_for(&self, phase: OngoingGamePhase) -> State {
        let (_, champ_select, in_game) = &*ONGOING_GAME_TREE;
        match phase {
            OngoingGamePhase::ChampSelect => champ_select.clone(),
            OngoingGamePhase::InGame => in_game.clone(),
            OngoingGamePhase::Idle => ONGOING_GAME_TREE.0.root(),
        }
    }

    fn phase_from_handle(&self, handle: State) -> OngoingGamePhase {
        let (_, champ_select, in_game) = &*ONGOING_GAME_TREE;
        if handle == *champ_select {
            OngoingGamePhase::ChampSelect
        } else if handle == *in_game {
            OngoingGamePhase::InGame
        } else {
            OngoingGamePhase::Idle
        }
    }

    fn current_phase(&self) -> OngoingGamePhase {
        self.phase
            .lock()
            .ok()
            .map(|g| *g)
            .unwrap_or(OngoingGamePhase::Idle)
    }

    // -- Side effects ---------------------------------------------------------

    fn apply_side_effects(
        &self,
        previous: OngoingGamePhase,
        next: OngoingGamePhase,
        _input: &DriverInput,
    ) {
        if next == previous {
            return;
        }

        // Update stored phase
        if let Ok(mut lock) = self.phase.lock() {
            *lock = next;
        }

        tracing::info!("OngoingGame phase: {previous:?} → {next:?}");

        match next {
            OngoingGamePhase::Idle => {
                // TODO: clear session cache
                self.emit_phase_changed(next);
            }
            OngoingGamePhase::ChampSelect | OngoingGamePhase::InGame => {
                self.emit_phase_changed(next);
                self.spawn_fetch_for_phase(next);
            }
        }
    }

    fn emit_phase_changed(&self, phase: OngoingGamePhase) {
        let payload = OngoingGamePhaseChanged {
            phase,
            our_side: None,          // TODO: determine from session data
            blue_players: Vec::new(), // TODO: populate from session data
            red_players: Vec::new(),  // TODO: populate from session data
        };
        let _ = self.app.emit("ongoing-game-phase-changed", &payload);
    }

    /// Spawn async tasks to fetch player data for the current phase.
    /// ChampSelect → fetch teammates only; InGame → fetch all 10.
    fn spawn_fetch_for_phase(&self, phase: OngoingGamePhase) {
        let lcu_session = self.lcu_session.clone();
        let app = self.app.clone();
        let token = self.cancel_token.child_token();

        tokio::spawn(async move {
            tokio::select! {
                _ = token.cancelled() => {}
                _ = fetch_phase_data(lcu_session, app, phase) => {}
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Data fetching (placeholder — will be fleshed out next step)
// ---------------------------------------------------------------------------

async fn fetch_phase_data(lcu_session: Arc<LcuSession>, _app: tauri::AppHandle, phase: OngoingGamePhase) {
    let api = lcu_session.api();
    match phase {
        OngoingGamePhase::ChampSelect => {
            match api.get_champ_select_session().await {
                Ok(session) => {
                    tracing::debug!("ChampSelect session fetched: {}", session);
                    // TODO: parse teammates, spawn per-player fetch tasks
                }
                Err(e) => {
                    tracing::warn!("Failed to fetch champ select session: {e}");
                }
            }
        }
        OngoingGamePhase::InGame => {
            match api.get_gameflow_session().await {
                Ok(session) => {
                    tracing::debug!("Gameflow session fetched: {}", session);
                    // TODO: parse all 10 players, spawn per-player fetch tasks
                }
                Err(e) => {
                    tracing::warn!("Failed to fetch gameflow session: {e}");
                }
            }
        }
        OngoingGamePhase::Idle => {}
    }
}

// ---------------------------------------------------------------------------
// Behaviors
// ---------------------------------------------------------------------------

fn transition_to(target: OngoingGamePhase) -> EventReply {
    let (_, champ_select, in_game) = &*ONGOING_GAME_TREE;
    match target {
        OngoingGamePhase::ChampSelect => EventReply::Transition(champ_select.clone()),
        OngoingGamePhase::InGame => EventReply::Transition(in_game.clone()),
        OngoingGamePhase::Idle => EventReply::Transition(ONGOING_GAME_TREE.0.root()),
    }
}

fn phase_from_event_data(data: &serde_json::Value) -> Option<&str> {
    data.as_str()
}

// -- Idle (root) --------------------------------------------------------------

struct IdleBehavior;

impl Behavior<DriverInput> for IdleBehavior {
    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match phase_from_event_data(&event.data) {
            Some("ChampSelect") => transition_to(OngoingGamePhase::ChampSelect),
            _ => EventReply::Ignored,
        }
    }
}

// -- ChampSelect --------------------------------------------------------------

struct ChampSelectBehavior;

impl Behavior<DriverInput> for ChampSelectBehavior {
    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match phase_from_event_data(&event.data) {
            Some("InProgress") => transition_to(OngoingGamePhase::InGame),
            Some("None") | Some("Lobby") => transition_to(OngoingGamePhase::Idle),
            _ => EventReply::Handled,
        }
    }
}

// -- InGame -------------------------------------------------------------------

struct InGameBehavior;

impl Behavior<DriverInput> for InGameBehavior {
    fn on_event(&self, event: &DriverInput, _current: &State, _tree: &dyn TreeView) -> EventReply {
        match phase_from_event_data(&event.data) {
            Some("EndOfGame") | Some("None") => transition_to(OngoingGamePhase::Idle),
            _ => EventReply::Handled,
        }
    }
}
