use std::sync::Arc;

use tokio::sync::broadcast;
use tokio_util::sync::CancellationToken;

use crate::concepts::ongoing_game::{OngoingGamePhase, OngoingGamePhaseChanged};
use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::watcher::LcuWsEvent;
use crate::shards::sgp::session::SgpSession;

use super::driver::OngoingGameDriver;

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

#[derive(Debug, Clone)]
pub enum OngoingGameManagerEvent {
    PhaseChanged(OngoingGamePhaseChanged),
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

pub struct OngoingGameManager {
    event_tx: broadcast::Sender<OngoingGameManagerEvent>,
    state: tokio::sync::Mutex<ManagerState>,
    cancel_token: CancellationToken,
}

struct ManagerState {
    driver: Option<OngoingGameDriver>,
    lcu_session: Option<Arc<LcuSession>>,
    sgp_session: Option<Arc<SgpSession>>,
}

impl OngoingGameManager {
    pub fn new(cancel_token: CancellationToken) -> Self {
        let (event_tx, _) = broadcast::channel(64);
        Self {
            event_tx,
            state: tokio::sync::Mutex::new(ManagerState {
                driver: None,
                lcu_session: None,
                sgp_session: None,
            }),
            cancel_token,
        }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<OngoingGameManagerEvent> {
        self.event_tx.subscribe()
    }

    pub async fn handle_focus_changed(
        &self,
        lcu_session: Option<Arc<LcuSession>>,
        sgp_session: Option<Arc<SgpSession>>,
    ) {
        let mut state = self.state.lock().await;

        // Drop the old driver
        state.driver = None;
        state.lcu_session = None;
        state.sgp_session = None;

        let Some(lcu) = lcu_session else {
            tracing::debug!("OngoingGame: no focused client, manager cleared");
            return;
        };

        let mut driver = OngoingGameDriver::new();

        // Seed initial phase from the current gameflow state
        match lcu.api().get_gameflow_phase().await {
            Ok(phase_str) => {
                let phase = match phase_str.as_str() {
                    "ChampSelect" => OngoingGamePhase::ChampSelect,
                    "InProgress" | "InGame" => OngoingGamePhase::InGame,
                    _ => OngoingGamePhase::Idle,
                };
                if let Some(new_phase) = driver.force_phase(phase) {
                    self.on_phase_changed(new_phase, &lcu);
                }
            }
            Err(e) => {
                tracing::debug!("Failed to seed gameflow phase: {e}");
            }
        }

        state.driver = Some(driver);
        state.lcu_session = Some(lcu);
        state.sgp_session = sgp_session;

        tracing::info!("OngoingGame: manager initialized for focused client");
    }

    /// Called by the event receiver for each WsEvent from the focused client.
    pub async fn handle_ws_event(&self, event: LcuWsEvent) {
        let mut state = self.state.lock().await;

        let Some(driver) = &mut state.driver else {
            return;
        };

        if let Some(new_phase) = driver.process(&event) {
            let lcu = state.lcu_session.clone();
            if let Some(lcu) = lcu {
                self.on_phase_changed(new_phase, &lcu);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Phase change reaction
    // -----------------------------------------------------------------------

    fn on_phase_changed(&self, phase: OngoingGamePhase, lcu_session: &Arc<LcuSession>) {
        // Emit loading state immediately
        let _ = self.event_tx.send(OngoingGameManagerEvent::PhaseChanged(
            OngoingGamePhaseChanged {
                phase,
                loading: phase != OngoingGamePhase::Idle,
                our_side: None,
                blue_players: Vec::new(),
                red_players: Vec::new(),
            },
        ));

        if phase == OngoingGamePhase::Idle {
            return;
        }

        // Spawn async data fetch
        let event_tx = self.event_tx.clone();
        let lcu = lcu_session.clone();
        let token = self.cancel_token.child_token();

        tokio::spawn(async move {
            tokio::select! {
                _ = token.cancelled() => {}
                _ = fetch_phase_data(phase, &lcu, &event_tx) => {}
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async fn fetch_phase_data(
    phase: OngoingGamePhase,
    lcu_session: &Arc<LcuSession>,
    event_tx: &broadcast::Sender<OngoingGameManagerEvent>,
) {
    match phase {
        OngoingGamePhase::ChampSelect => {
            match lcu_session.api().get_champ_select_session().await {
                Ok(_session) => {
                    tracing::debug!("ChampSelect session fetched");
                    // TODO: parse teammates, build PlayerSlot list, fetch per-player data
                    let _ = event_tx.send(OngoingGameManagerEvent::PhaseChanged(
                        OngoingGamePhaseChanged {
                            phase,
                            loading: false,
                            our_side: None,
                            blue_players: Vec::new(),
                            red_players: Vec::new(),
                        },
                    ));
                }
                Err(e) => {
                    tracing::warn!("Failed to fetch champ select session: {e}");
                }
            }
        }
        OngoingGamePhase::InGame => {
            match lcu_session.api().get_gameflow_session().await {
                Ok(_session) => {
                    tracing::debug!("Gameflow session fetched");
                    // TODO: parse all 10 players, fetch per-player data
                    let _ = event_tx.send(OngoingGameManagerEvent::PhaseChanged(
                        OngoingGamePhaseChanged {
                            phase,
                            loading: false,
                            our_side: None,
                            blue_players: Vec::new(),
                            red_players: Vec::new(),
                        },
                    ));
                }
                Err(e) => {
                    tracing::warn!("Failed to fetch gameflow session: {e}");
                }
            }
        }
        OngoingGamePhase::Idle => {}
    }
}
