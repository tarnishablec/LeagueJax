use serde::{Deserialize, Serialize};
use serde_json::Value;
use ts_rs::TS;

use super::matchmaking_ready_check::MatchmakingReadyCheckData;
use super::EventType;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct MatchmakingSearch {
    pub event_type: EventType,
    /// /lol-matchmaking/v1/search
    pub uri: String,
    pub data: Option<MatchmakingSearchData>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct MatchmakingSearchData {
    pub dodge_data: MatchmakingDodgeData,
    #[ts(type = "Array<Record<string, unknown>>")]
    pub errors: Vec<Value>,
    pub estimated_queue_time: f64,
    pub is_currently_in_queue: bool,
    pub lobby_id: String,
    pub low_priority_data: MatchmakingLowPriorityData,
    pub queue_id: u64,
    pub ready_check: MatchmakingReadyCheckData,
    pub search_state: MatchmakingSearchState,
    pub time_in_queue: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct MatchmakingDodgeData {
    pub dodger_id: u64,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(default, rename_all = "camelCase")]
pub struct MatchmakingLowPriorityData {
    pub busted_leaver_access_token: String,
    pub penalized_summoner_ids: Vec<u64>,
    pub penalty_time: f64,
    pub penalty_time_remaining: f64,
    pub reason: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, TS, PartialEq, Eq)]
#[ts(export, export_to = "lcu_events.ts")]
#[serde(rename_all = "PascalCase")]
pub enum MatchmakingSearchState {
    #[default]
    Invalid,
    Searching,
    Found,
    #[serde(other)]
    Unknown,
}

#[cfg(test)]
mod tests {
    use super::{MatchmakingSearch, MatchmakingSearchState};

    #[test]
    fn deserializes_matchmaking_search_payload_with_all_known_fields() {
        let raw = r#"{
            "eventType": "Update",
            "uri": "/lol-matchmaking/v1/search",
            "data": {
                "dodgeData": {
                    "dodgerId": 0,
                    "state": "Invalid"
                },
                "errors": [],
                "estimatedQueueTime": 59.53499984741211,
                "isCurrentlyInQueue": true,
                "lobbyId": "",
                "lowPriorityData": {
                    "bustedLeaverAccessToken": "",
                    "penalizedSummonerIds": [],
                    "penaltyTime": 0.0,
                    "penaltyTimeRemaining": 0.0,
                    "reason": ""
                },
                "queueId": 420,
                "readyCheck": {
                    "declinerIds": [],
                    "dodgeWarning": "None",
                    "playerResponse": "None",
                    "state": "InProgress",
                    "suppressUx": false,
                    "timer": 0.0
                },
                "searchState": "Found",
                "timeInQueue": 84.0
            }
        }"#;

        let payload: MatchmakingSearch =
            serde_json::from_str(raw).expect("matchmaking search should deserialize");
        let data = payload
            .data
            .expect("matchmaking search payload should contain data");

        assert_eq!(data.dodge_data.dodger_id, 0);
        assert_eq!(data.dodge_data.state, "Invalid");
        assert!(data.errors.is_empty());
        assert_eq!(data.lobby_id, "");
        assert_eq!(data.low_priority_data.penalized_summoner_ids.len(), 0);
        assert_eq!(data.queue_id, 420);
        assert_eq!(data.search_state, MatchmakingSearchState::Found);
        assert_eq!(data.time_in_queue, 84.0);
    }
}
