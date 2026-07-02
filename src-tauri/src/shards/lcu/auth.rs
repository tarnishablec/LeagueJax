use base64::{engine::general_purpose::STANDARD, Engine};

use crate::utils::league_cmd_arg::LeagueClientCmdArgs;

#[derive(Debug, Clone)]
pub struct LcuAuth {
    pub pid: u32,
    pub port: u16,
    #[allow(dead_code)]
    pub token: String,
    pub region: Option<String>,
    pub rso_platform_id: Option<String>,
    pub cmd_args: LeagueClientCmdArgs,
    /// "Basic <base64(riot:{token})>"
    pub auth_header: String,
}

impl LcuAuth {
    pub fn new(
        pid: u32,
        port: u16,
        token: String,
        region: Option<String>,
        rso_platform_id: Option<String>,
        cmd_args: LeagueClientCmdArgs,
    ) -> Self {
        let encoded = STANDARD.encode(format!("riot:{token}"));
        Self {
            pid,
            port,
            token,
            region,
            rso_platform_id,
            cmd_args,
            auth_header: format!("Basic {encoded}"),
        }
    }
}
