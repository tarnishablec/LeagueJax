pub const AUTO_ACCEPT_SETTING_ID: &str = "matchmaking.interaction.autoAccept";
// Keep the persisted id for compatibility with existing user settings.
pub const ACCEPT_DELAY_SECONDS_SETTING_ID: &str = "matchmaking.interaction.acceptDelayMs";
pub const AUTO_ACCEPT_DEFAULT: bool = true;
pub const ACCEPT_DELAY_DEFAULT_SECONDS: f64 = 1.0;
pub const ACCEPT_DELAY_MIN_SECONDS: f64 = 0.0;
pub const ACCEPT_DELAY_MAX_SECONDS: f64 = 3.0;
