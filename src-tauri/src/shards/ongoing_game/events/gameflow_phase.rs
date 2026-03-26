use super::EventType;

pub struct GameflowPhase {
    event_type: EventType,
    /// /lol-gameflow/v1/gameflow-phase
    uri: String,
    data: Phase,
}

pub enum Phase {
    None,
    ChampSelect,
    Matchmaking,
    GameStart,
    ReadyCheck,
    InProgress,
    WaitingForStats,
    TerminatedInError,
    Lobby,
}
