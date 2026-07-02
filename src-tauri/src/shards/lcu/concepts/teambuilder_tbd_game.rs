use super::EventType;
use serde::de::{DeserializeOwned, Error};
use serde::{Deserialize, Deserializer, Serialize};
use strum::AsRefStr;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeambuilderTbdGame {
    pub event_type: EventType,
    pub uri: String,
    pub data: TeambuilderTbdGameMessage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeambuilderTbdGameMessage {
    #[serde(default)]
    pub ack_required: bool,
    pub id: String,
    #[serde(deserialize_with = "deserialize_json_string")]
    pub payload: TeambuilderTbdGamePayload,
    pub resource: String,
    pub service: String,
    pub timestamp: u64,
    pub version: String,
}

#[allow(non_camel_case_types)]
#[derive(Debug, Clone, Serialize, Deserialize, AsRefStr)]
pub enum PhaseName {
    CHAMPION_SELECT,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeambuilderTbdGamePayload {
    pub counter: i64,
    pub phase_name: PhaseName,
    pub queue_id: u64,
    pub game_id: u64,
    pub context_id: String,
    pub champion_select_state: TeambuilderChampionSelectState,
    pub request_guid: String,
}

#[allow(non_camel_case_types)]
#[allow(clippy::upper_case_acronyms)]
#[derive(Debug, Clone, Serialize, Deserialize, AsRefStr)]
pub enum Subphase {
    BAN_PICK,
    FINALIZATION,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeambuilderChampionSelectState {
    pub team_id: String,
    pub team_chat_room_id: String,
    pub subphase: Subphase,
    pub cells: TeambuilderCells,
    pub local_player_cell_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TeambuilderCells {
    pub allied_team: Vec<TeambuilderCell>,
    pub enemy_team: Vec<TeambuilderCell>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Copy, AsRefStr)]
#[allow(clippy::upper_case_acronyms)]
pub enum NameVisibilityType {
    HIDDEN,
    #[default]
    #[serde(other)]
    UNHIDDEN,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct TeambuilderCell {
    pub team_id: u64,
    pub cell_id: u64,
    pub puuid: String,
    pub summoner_name: String,
    pub game_name: String,
    pub tag_line: String,
    pub is_humanoid: bool,
    pub is_autofilled: bool,
    pub summoner_id: i64,
    pub champion_pick_intent: u64,
    pub champion_id: u64,
    pub assigned_position: String,
    pub spell1_id: u64,
    pub spell2_id: u64,
    pub skin_id: u64,
    pub name_visibility_type: NameVisibilityType,
}

impl From<NameVisibilityType> for super::champ_select_session::NameVisibilityType {
    fn from(name_visibility_type: NameVisibilityType) -> Self {
        match name_visibility_type {
            NameVisibilityType::HIDDEN => super::champ_select_session::NameVisibilityType::HIDDEN,
            NameVisibilityType::UNHIDDEN => {
                super::champ_select_session::NameVisibilityType::VISIBLE
            }
        }
    }
}

fn deserialize_json_string<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: DeserializeOwned,
{
    let raw = String::deserialize(deserializer)?;
    serde_json::from_str(&raw).map_err(D::Error::custom)
}

#[cfg(test)]
mod tests {
    use super::TeambuilderTbdGame;

    #[test]
    fn deserializes_stringified_payload_into_struct() {
        let raw = r#"{
            "eventType": "Create",
            "uri": "/riot-messaging-service/v1/message/teambuilder/v1/tbdGameDtoV1",
            "data": {
                "ackRequired": false,
                "id": "",
                "payload": "{\"counter\":1,\"phaseName\":\"CHAMPION_SELECT\",\"queueId\":420,\"gameId\":500720696958,\"contextId\":\"test-context\",\"championSelectState\":{\"teamId\":\"1\",\"teamChatRoomId\":\"test-room\",\"subphase\":\"BAN_PICK\",\"localPlayerCellId\":5,\"cells\":{\"alliedTeam\":[{\"cellId\":5,\"puuid\":\"0e01ef20-e8da-5d20-8e3b-4feff97acea5\",\"summonerId\":16645175669},{\"cellId\":7,\"puuid\":\"3e7ba79d-87e7-52c9-a034-3746e1a8ca02\",\"summonerId\":3515302757346176}],\"enemyTeam\":[]}},\"requestGuid\":\"test-request\"}",
                "resource": "teambuilder/v1/tbdGameDtoV1",
                "service": "teambuilder",
                "timestamp": 1775106822697,
                "version": "1"
            }
        }"#;

        let event: TeambuilderTbdGame =
            serde_json::from_str(raw).expect("teambuilder event should deserialize");

        assert_eq!(event.data.payload.game_id, 500720696958);
        assert_eq!(
            event
                .data
                .payload
                .champion_select_state
                .cells
                .allied_team
                .len(),
            2
        );
        assert_eq!(
            event.data.payload.champion_select_state.cells.allied_team[0].cell_id,
            5
        );
        assert_eq!(
            event.data.payload.champion_select_state.cells.allied_team[0].puuid,
            "0e01ef20-e8da-5d20-8e3b-4feff97acea5"
        );
        assert_eq!(
            event.data.payload.champion_select_state.cells.allied_team[1].summoner_id,
            3515302757346176
        );
    }
}
