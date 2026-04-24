use std::sync::Arc;

use tokio::sync::{broadcast, mpsc};

use crate::shards::lcu::concepts::EventType;
use crate::shards::lcu::LcuShard;
use crate::shards::settings::SettingHandle;
use crate::shards::sgp::SgpShard;

use super::context::{Channels, OngoingGameCtx};
use super::runtime::machine_loop;
use super::types::{OngoingGameEvent, OngoingGameInput, OngoingGameUpdated};

pub(crate) const DEFAULT_MATCH_HISTORY_COUNT: u32 = 50;
const QUEUE_MODE_CURRENT_VALUE: &str = "__current_mode__";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MatchHistoryModeSetting {
    All,
    CurrentMode,
    FixedTag(String),
}

impl MatchHistoryModeSetting {
    pub fn payload_value(&self) -> Option<String> {
        match self {
            Self::All => None,
            Self::CurrentMode => Some(QUEUE_MODE_CURRENT_VALUE.to_string()),
            Self::FixedTag(tag) => Some(tag.clone()),
        }
    }

    pub fn effective_tag(&self, effective_queue_id: Option<u64>) -> Option<String> {
        match self {
            Self::All => None,
            Self::CurrentMode => effective_queue_id.map(|queue_id| format!("q_{queue_id}")),
            Self::FixedTag(tag) => Some(tag.clone()),
        }
    }
}

#[derive(Clone)]
pub struct OngoingGameSettings {
    pub match_history_count: SettingHandle,
}

impl OngoingGameSettings {
    pub fn match_history_count_value(&self) -> u32 {
        self.match_history_count
            .get_value()
            .ok()
            .as_ref()
            .and_then(|value| value.as_u64()?.try_into().ok())
            .unwrap_or(DEFAULT_MATCH_HISTORY_COUNT)
    }
}

#[derive(Clone)]
pub struct OngoingGameManager {
    input_tx: mpsc::UnboundedSender<OngoingGameInput>,
    channels: Arc<Channels>,
}

impl OngoingGameManager {
    pub fn new(
        settings: OngoingGameSettings,
        sgp_shard: Arc<SgpShard>,
        lcu_shard: Arc<LcuShard>,
    ) -> Self {
        let (input_tx, input_rx) = mpsc::unbounded_channel();
        let ctx = OngoingGameCtx::new(lcu_shard.clone(), sgp_shard, settings, input_tx.clone());
        let channels = ctx.channels.clone();

        std::thread::Builder::new()
            .name("ongoing-game-machine".into())
            .spawn(move || {
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .unwrap_or_else(|err| panic!("build ongoing-game tokio runtime: {err}"));
                rt.block_on(machine_loop(input_rx, ctx));
            })
            .unwrap_or_else(|err| panic!("spawn ongoing-game-machine thread: {err}"));

        Self { input_tx, channels }
    }

    pub fn post(&self, input: OngoingGameInput) {
        let _ = self.input_tx.send(input);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<OngoingGameEvent> {
        self.channels.subscribe()
    }

    pub fn snapshot(&self) -> OngoingGameUpdated {
        self.channels.snapshot()
    }

    /// Subscribe to LCU focus and WS events. Must be called after LcuShard is initialized.
    pub fn start(&self, lcu_shard: &Arc<LcuShard>) {
        let Some(lcu_manager) = lcu_shard.manager() else {
            tracing::error!("[ongoing_game] LcuShard manager not initialized");
            return;
        };

        let tx = self.input_tx.clone();
        lcu_manager.clone().subscribe_state_fn(move |event| {
            let tx = tx.clone();
            async move {
                if let crate::shards::lcu::manager::LcuManagerStateEvent::FocusChanged(change) =
                    event
                {
                    let _ = tx.send(OngoingGameInput::FocusChanged(change));
                }
            }
        });

        let tx = self.input_tx.clone();
        lcu_manager.subscribe_ws_fn(move |ws_event| {
            let tx = tx.clone();
            async move {
                use crate::shards::lcu::concepts::LcuWsEvent;
                match ws_event {
                    LcuWsEvent::GameflowSession(payload) => {
                        let _ = tx.send(OngoingGameInput::GameflowSessionUpdated(Box::new(
                            payload.data,
                        )));
                    }
                    LcuWsEvent::MatchmakingSearch(payload) => {
                        match (payload.event_type, payload.data) {
                            (EventType::Delete, _) | (_, None) => {
                                let _ = tx.send(OngoingGameInput::MatchmakingSearchDeleted);
                            }
                            (_, Some(data)) => {
                                let _ = tx.send(OngoingGameInput::MatchmakingSearchUpdated(
                                    Box::new(data),
                                ));
                            }
                        }
                    }
                    LcuWsEvent::MatchmakingReadyCheck(payload) => {
                        match (payload.event_type, payload.data) {
                            (EventType::Delete, _) | (_, None) => {
                                let _ = tx.send(OngoingGameInput::ReadyCheckDeleted);
                            }
                            (_, Some(data)) => {
                                let _ =
                                    tx.send(OngoingGameInput::ReadyCheckUpdated(Box::new(data)));
                            }
                        }
                    }
                    LcuWsEvent::ChampSelectSession(payload) => {
                        let _ = tx.send(OngoingGameInput::ChampSelectSessionUpdated(Box::new(
                            payload.data,
                        )));
                    }
                    LcuWsEvent::TeambuilderTbdGame(payload) => {
                        let _ = tx.send(OngoingGameInput::TeambuilderTbdGameUpdated(Box::new(
                            payload.data.payload,
                        )));
                    }
                    _ => {}
                }
            }
        });
    }
}
