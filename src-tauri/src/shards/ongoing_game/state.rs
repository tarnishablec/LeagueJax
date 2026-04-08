use crate::shards::lcu::concepts::teambuilder_tbd_game::TeambuilderTbdGamePayload;
use crate::shards::ongoing_game::driver::OngoingGameDriver;

#[allow(dead_code)]
pub(crate) struct OngoingState {
    pid: Option<i32>,
    game_id: Option<u64>,

    driver: OngoingGameDriver,

    cached_team: Option<TeambuilderTbdGamePayload>,
}

impl OngoingState {
    pub(crate) fn new() -> Self {
        Self {
            pid: None,
            game_id: None,
            driver: OngoingGameDriver::new(),
            cached_team: None,
        }
    }
}
