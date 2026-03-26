use crate::shards::ongoing_game::events::EventType;

pub struct ChampSelectSession {
    event_type: EventType,
    /// /lol-champ-select/v1/session
    uri: String,
    data: ChampSelectSessionData,
}

pub struct ChampSelectSessionData {
    actions: Vec<Vec<Action>>,
    allow_battle_boost: bool,
    allow_duplicated_picks: bool,
    allow_locked_events: bool,
    allow_player_pick_same_champion: bool,
    allow_rerolling: bool,
    allow_skin_selection: bool,
    allow_subset_champion_picks: bool,
    bans: Bans,
    bench_champions: Vec<()>,
    bench_enabled: bool,
    boostable_skin_count: u64,
    chat_details: ChatDetails,
    counter: i64,
    disallow_banning_teammate_hovered_champions: bool,
    game_id: u64,
    has_simultaneous_bans: bool,
    has_simultaneous_picks: bool,
    id: String,
    is_custom_game: bool,
    is_legacy_champ_select: bool,
    is_spectating: bool,
    local_player_cell_id: i64,
    locked_event_index: i64,
    my_team: Vec<Team>,
    pick_order_swaps: Vec<Swap>,
    position_swaps: Vec<Swap>,
    queue_id: u64,
    rerolls_remaining: u64,
    show_quit_button: bool,
    skip_champion_select: bool,
    their_team: Vec<Team>,
    timer: Timer,
    trades: Vec<Swap>,
}

pub struct Swap {
    cell_id: u64,
    id: u64,
    state: String, // AVAILABLE
}

pub struct Team {
    assigned_position: String, // middle | top | bottom
    cell_id: u64,
    champion_id: u64,
    champion_pick_intent: u64,
    game_name: String,
    internal_name: String,
    is_auto_filled: bool,
    is_humanoid: bool,
    name_visibility_type: String, // VISIBLE | HIDDEN
    obfuscate_puuid: String,
    obfuscate_summoner_id: u64,
    pick_mode: u64,
    pick_turn: u64,
    player_alias: String,
    player_type: String,
    puuid: uuid::Uuid,
    selected_skin_id: u64,
    spell1_id: u64,
    spell2_id: u64,
    summoner_id: u64,
    tag_line: String,
    team: u64,
    ward_skin_id: i64,
}

pub struct Action {
    actor_cell_id: u64,
    champion_id: u64,
    completed: bool,
    duration: u64,
    id: u64,
    is_ally_action: bool,
    is_in_progress: bool,
    pick_turn: u64,
    r#type: String, // ban | pick | ten_bans_reveal
}

pub struct Timer {
    adjust_time_left_in_phase: u64,
    internal_now_epoc_ms: u64,
    is_infinite: bool,
    phase: String,
    total_time_in_phase: u64,
}

pub struct ChatDetails {
    muc_jwt_dto: MucJwtDto,
    multi_user_chat_id: String,
    multi_user_chat_password: String,
}

pub struct MucJwtDto {
    channel_claim: String,
    domain: String,
    jwt: String,
    target_region: String,
}

pub struct Bans {
    my_team_bans: Vec<()>,
    num_bans: u64,
    their_team_bans: Vec<()>,
}
