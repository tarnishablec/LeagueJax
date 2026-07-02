use serde::de::Error;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use strum::AsRefStr;
use ts_rs::TS;

use super::endpoints::*;

pub mod champ_select_session;
pub mod chat;
pub mod cherry;
pub mod claim;
pub mod gameflow_phase;
pub mod gameflow_session;
pub mod lobby;
pub mod maps;
pub mod matchmaking_ready_check;
pub mod matchmaking_search;
pub mod queues;
pub mod rank;
pub mod replays;
pub mod summoner;
pub mod teambuilder_tbd_game;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default, TS, AsRefStr)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(rename_all = "PascalCase")]
pub enum EventType {
    #[default]
    Update,
    Create,
    Delete,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Default, TS)]
#[ts(export, export_to = "lane.ts")]
#[serde(rename_all = "lowercase")]
pub enum LanePosition {
    #[default]
    None,
    Middle,
    Top,
    Bottom,
    Jungle,
    Utility,
    Fill,
    #[serde(rename = "AFK")]
    #[allow(clippy::upper_case_acronyms)]
    AFK,
}

impl<'de> Deserialize<'de> for LanePosition {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = Option::<String>::deserialize(deserializer)?;
        Ok(match raw {
            Some(s) if !s.trim().is_empty() => match s.to_ascii_lowercase().as_str() {
                "middle" | "mid" => Self::Middle,
                "top" => Self::Top,
                "bottom" | "bot" | "adc" => Self::Bottom,
                "jungle" | "jg" => Self::Jungle,
                "utility" | "support" | "sup" => Self::Utility,
                "fill" => Self::Fill,
                "afk" => Self::AFK,
                _ => Self::None,
            },
            _ => Self::None,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, AsRefStr)]
pub enum LcuWsEvent {
    GameflowPhase(gameflow_phase::GameflowPhase),
    GameflowSession(gameflow_session::GameflowSession),
    ChampSelectSession(champ_select_session::ChampSelectSession),
    MatchmakingSearch(matchmaking_search::MatchmakingSearch),
    MatchmakingReadyCheck(matchmaking_ready_check::MatchmakingReadyCheck),
    Lobby(lobby::LobbyEvent),
    TeambuilderTbdGame(teambuilder_tbd_game::TeambuilderTbdGame),
    Other(Value),
}

impl TryFrom<Value> for LcuWsEvent {
    type Error = serde_json::Error;

    fn try_from(value: Value) -> Result<Self, Self::Error> {
        let uri = value
            .get("uri")
            .and_then(|v| v.as_str())
            .ok_or(serde_json::Error::custom("Missing 'uri' field"))?;

        match uri {
            URI_GAMEFLOW_PHASE => {
                serde_json::from_value(value.clone()).map(LcuWsEvent::GameflowPhase)
            }
            URI_GAMEFLOW_SESSION => {
                serde_json::from_value(value.clone()).map(LcuWsEvent::GameflowSession)
            }
            URI_CHAMP_SELECT_SESSION | URI_TEAM_BUILDER_CHAMP_SELECT_SESSION => {
                serde_json::from_value(value.clone()).map(LcuWsEvent::ChampSelectSession)
            }
            URI_MATCHMAKING_SEARCH => {
                serde_json::from_value(value.clone()).map(LcuWsEvent::MatchmakingSearch)
            }
            URI_MATCHMAKING_READY_CHECK => {
                serde_json::from_value(value.clone()).map(LcuWsEvent::MatchmakingReadyCheck)
            }
            URI_LOBBY_V2_LOBBY => serde_json::from_value(value.clone()).map(LcuWsEvent::Lobby),
            URI_RMS_TEAMBUILDER_TBD_GAME => {
                serde_json::from_value(value.clone()).map(LcuWsEvent::TeambuilderTbdGame)
            }
            _ => Ok(LcuWsEvent::Other(value)),
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::{champ_select_session::ChampSelectSession, LcuWsEvent};

    fn champ_select_payload(uri: &str, actor_cell_id: i64) -> Value {
        json!({
            "eventType": "Create",
            "uri": uri,
            "data": {
                "actions": [[{
                    "actorCellId": actor_cell_id,
                    "championId": 0,
                    "completed": false,
                    "duration": 0,
                    "id": 1,
                    "isAllyAction": false,
                    "isInProgress": false,
                    "pickTurn": 0,
                    "type": "ban"
                }]],
                "gameId": 300841080420u64,
                "localPlayerCellId": 7,
                "myTeam": [{
                    "cellId": 7,
                    "puuid": "ec252631-f4b4-5ade-8ecf-ef7e69b76caf",
                    "summonerId": 16168844203i64,
                    "team": 2
                }],
                "queueId": 420,
                "theirTeam": []
            }
        })
    }

    #[test]
    fn champ_select_session_allows_negative_actor_cell_id() {
        let raw = champ_select_payload("/lol-champ-select/v1/session", -1);
        let parsed: Result<ChampSelectSession, _> = serde_json::from_value(raw);

        assert!(
            parsed.is_ok(),
            "champ-select session should accept actorCellId=-1"
        );
    }

    #[test]
    fn team_builder_champ_select_session_ws_event_is_parsed() -> Result<(), serde_json::Error> {
        let raw = champ_select_payload("/lol-lobby-team-builder/champ-select/v1/session", 0);
        let event = LcuWsEvent::try_from(raw)?;

        assert!(
            matches!(event, LcuWsEvent::ChampSelectSession(_)),
            "team-builder champ-select session should be routed as ChampSelectSession"
        );

        Ok(())
    }
}
