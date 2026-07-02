use async_trait::async_trait;
use std::path::PathBuf;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};

use super::auth::LcuAuth;
use crate::utils::league_cmd_arg::{parse_league_client_cmd_args, LeagueClientCmdArgs};

pub struct DetectedUxClient {
    pub auth: LcuAuth,
    pub ux_exe_path: Option<PathBuf>,
}

pub const UX_PROCESS_NAME: &str = "LeagueClientUx.exe";

#[async_trait]
pub trait LcuDetector: Send + Sync {
    /// Detect all LCU processes, return auth info for each.
    async fn detect_all(&self) -> Vec<DetectedUxClient>;
}

/// Windows implementation: reads LeagueClientUx process command line args
#[cfg(target_os = "windows")]
pub struct WindowsLcuDetector;

#[cfg(target_os = "windows")]
#[async_trait]
impl LcuDetector for WindowsLcuDetector {
    async fn detect_all(&self) -> Vec<DetectedUxClient> {
        let mut sys = System::new_all();

        sys.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing().with_cmd(UpdateKind::Always),
        );

        let mut results = Vec::new();
        for (pid, process) in sys.processes() {
            let name = process.name().to_string_lossy();
            if name.eq(UX_PROCESS_NAME) {
                let cmd_str =
                    crate::utils::cmd::get_process_cmdline(pid.as_u32()).unwrap_or_default();
                let cmd_args = match parse_league_client_cmd_args(cmd_str) {
                    Ok(cmd_args) => cmd_args,
                    Err(error) => {
                        tracing::debug!(
                            "Skip LeagueClientUx pid={} due to cmd parse error: {}",
                            pid.as_u32(),
                            error
                        );
                        continue;
                    }
                };

                let (port, token, region, rso_platform_id) = match &cmd_args {
                    LeagueClientCmdArgs::Tencent(args) => (
                        args.app_port,
                        args.remoting_auth_token.clone(),
                        Some(args.region.clone()),
                        Some(args.rso_platform_id.clone()),
                    ),
                    LeagueClientCmdArgs::Riot(args) => (
                        args.app_port,
                        args.remoting_auth_token.clone(),
                        Some(args.region.clone()),
                        None,
                    ),
                };
                let ux_exe_path = process.exe().map(|p| p.to_path_buf());
                results.push(DetectedUxClient {
                    auth: LcuAuth::new(
                        pid.as_u32(),
                        port,
                        token,
                        region,
                        rso_platform_id,
                        cmd_args,
                    ),
                    ux_exe_path,
                });
            }
        }
        results
    }
}

#[cfg(not(target_os = "windows"))]
pub struct NoopLcuDetector;

#[cfg(not(target_os = "windows"))]
#[async_trait]
impl LcuDetector for NoopLcuDetector {
    async fn detect_all(&self) -> Vec<DetectedUxClient> {
        Vec::new()
    }
}
