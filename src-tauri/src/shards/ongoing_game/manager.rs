use serde::Deserializer;
use serde_json::Value;
use std::cmp::PartialEq;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;

use super::context::{OngoingGameContext, MAX_MATCH_HISTORY_FETCH_CONCURRENCY};

use crate::shards::lcu::api::OngoingSessionSeed;
use crate::shards::lcu::concepts::champ_select_session::{
    ChampSelectSessionData, TeamMember as ChampSelectTeamMember,
};
use crate::shards::lcu::concepts::gameflow_phase::Phase as GameflowPhase;
use crate::shards::lcu::concepts::gameflow_session::GameflowSessionData;
use crate::shards::lcu::concepts::summoner::SummonerInfo;
use crate::shards::lcu::concepts::teambuilder_tbd_game::{
    PhaseName, TeambuilderCell, TeambuilderTbdGamePayload,
};
use crate::shards::lcu::concepts::{EventType, LanePosition, LcuWsEvent};
use crate::shards::lcu::manager::{FocusChange, LcuManagerStateEvent};
use crate::shards::lcu::LcuShard;
use crate::shards::ongoing_game::types::{
    OngoingGameEvent, OngoingGameMatchHistoriesUpdated, OngoingGameMatchHistoryState,
    OngoingGamePhase, OngoingGamePlayerLoadStatus, OngoingGameSummonerState,
    OngoingGameSummonersUpdated, OngoingGameUpdated,
};
use crate::shards::settings::SettingHandle;
use crate::shards::sgp::matches::RawMatchSummaryGame;
use crate::shards::sgp::LcuSessionSgpExt;
use crate::shards::sgp::SgpShard;

use super::driver::OngoingGameDriver;

pub(crate) const DEFAULT_MATCH_HISTORY_COUNT: u32 = 50;
const BOT_PUUID: &str = "BOT";
const QUEUE_MODE_CURRENT_VALUE: &str = "__current_mode__";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MatchHistoryModeSetting {
    All,
    CurrentMode,
    FixedTag(String),
}

impl MatchHistoryModeSetting {
    fn payload_value(&self) -> Option<String> {
        match self {
            Self::All => None,
            Self::CurrentMode => Some(QUEUE_MODE_CURRENT_VALUE.to_string()),
            Self::FixedTag(tag) => Some(tag.clone()),
        }
    }

    fn effective_tag(&self, effective_queue_id: Option<u64>) -> Option<String> {
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
    pub(crate) ctx: Arc<OngoingGameContext>,
}

impl OngoingGameManager {
    pub(crate) fn new(
        settings: OngoingGameSettings,
        sgp_shard: Arc<SgpShard>,
        lcu_shard: Arc<LcuShard>,
    ) -> Self {
        Self {
            ctx: Arc::new(OngoingGameContext::new(settings, sgp_shard, lcu_shard)),
        }
    }

    pub async fn handle_ws_event(&self, event: LcuWsEvent) {
        let mut state = self.ctx.state.lock().await;

        match &event {
            LcuWsEvent::GameflowSession(payload) => {
                let phase = &payload.data.phase;
                match phase {
                    GameflowPhase::InGame => {}
                    GameflowPhase::ChampSelect => {}
                    _ => {}
                }
            }
            LcuWsEvent::ChampSelectSession(payload) => {}
            LcuWsEvent::TeambuilderTbdGame(payload) => {
                let phase = &payload.data.payload.phase_name;
                match phase {
                    PhaseName::CHAMPION_SELECT => {
                        let allied_team =
                            &payload.data.payload.champion_select_state.cells.allied_team;
                    }
                }
            }
            _ => {}
        }
    }

    /// Subscribe to LCU focus changes via the LcuShard.  Must be called once
    /// after `LcuShard::initialize` so that `lcu_shard.manager()` is `Some`.
    pub fn start(self: &Arc<Self>) {
        let Some(lcu_manager) = self.ctx.lcu_shard.manager() else {
            tracing::error!(
                "[ongoing_game] start: LcuShard manager not initialized — focus subscription skipped"
            );
            return;
        };

        let manager = self.clone();
        lcu_manager.clone().subscribe_state_fn(move |event| {
            let manager = manager.clone();
            async move {
                if let LcuManagerStateEvent::FocusChanged(change) = event {
                    manager.on_focus_changed(change).await;
                }
            }
        });

        let manager = self.clone();
        lcu_manager.subscribe_ws_fn(move |ws_event| {
            let manager = manager.clone();
            async move {
                manager.handle_ws_event(ws_event).await;
            }
        });
    }

    async fn on_focus_changed(self: &Arc<Self>, change: FocusChange) {}

    pub fn subscribe(&self) -> tokio::sync::broadcast::Receiver<OngoingGameEvent> {
        self.ctx.channels.subscribe()
    }

    async fn seed_from_current_session(&self, expected_pid: Option<u32>) {
        todo!()
    }

    async fn current_focus_matches(&self, expected_pid: Option<u32>) -> bool {
        self.ctx.focused_pid().await == expected_pid
    }
}
