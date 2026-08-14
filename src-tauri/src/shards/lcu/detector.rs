use async_trait::async_trait;
use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use sysinfo::{Process, ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};

use super::auth::LcuAuth;
use crate::utils::league_cmd_arg::{
    parse_league_client_args, parse_league_client_cmd_args, LeagueClientCmdArgs,
};

pub struct DetectedUxClient {
    pub auth: LcuAuth,
    pub ux_exe_path: Option<PathBuf>,
}

pub const UX_PROCESS_NAME: &str = "LeagueClientUx.exe";
const UX_PROCESS_STEM: &str = "LeagueClientUx";

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
            ProcessRefreshKind::nothing()
                .with_cmd(UpdateKind::Always)
                .with_exe(UpdateKind::Always),
        );

        let mut results = Vec::new();
        for (pid, process) in sys.processes() {
            if !is_ux_process(process) {
                continue;
            }

            let sysinfo_args = process
                .cmd()
                .iter()
                .map(|arg| arg.to_string_lossy().into_owned())
                .collect::<Vec<_>>();
            let cmd_args = match crate::utils::cmd::get_process_cmdline(pid.as_u32()) {
                Ok(raw_cmdline) if !raw_cmdline.trim().is_empty() => {
                    parse_league_client_cmd_args(&raw_cmdline)
                }
                Ok(_) if !sysinfo_args.is_empty() => {
                    tracing::debug!(
                        pid = pid.as_u32(),
                        "Native LCU command line was empty; using sysinfo arguments"
                    );
                    parse_league_client_args(&sysinfo_args)
                }
                Err(error) if !sysinfo_args.is_empty() => {
                    tracing::debug!(
                        pid = pid.as_u32(),
                        error = %error,
                        "Failed to read native LCU command line; using sysinfo arguments"
                    );
                    parse_league_client_args(&sysinfo_args)
                }
                Ok(_) => {
                    tracing::debug!(
                        pid = pid.as_u32(),
                        "Skipping LCU process because its command line is empty"
                    );
                    continue;
                }
                Err(error) => {
                    tracing::debug!(
                        pid = pid.as_u32(),
                        error = %error,
                        "Skipping LCU process because its command line is unavailable"
                    );
                    continue;
                }
            };

            let (app_port, remoting_auth_token, region, rso_platform_id) = match &cmd_args {
                LeagueClientCmdArgs::Tencent(args) => (
                    args.app_port,
                    args.remoting_auth_token.as_ref(),
                    args.region.clone(),
                    args.rso_platform_id.clone(),
                ),
                LeagueClientCmdArgs::Riot(args) => (
                    args.app_port,
                    args.remoting_auth_token.as_ref(),
                    args.region.clone(),
                    None,
                ),
            };
            let (Some(port), Some(token)) = (app_port, remoting_auth_token) else {
                tracing::debug!(
                    pid = pid.as_u32(),
                    missing_app_port = app_port.is_none(),
                    missing_remoting_auth_token = remoting_auth_token.is_none(),
                    "Skipping LCU process because required authentication arguments are missing"
                );
                continue;
            };
            let ux_exe_path = process.exe().map(|p| p.to_path_buf());
            results.push(DetectedUxClient {
                auth: LcuAuth::new(
                    pid.as_u32(),
                    port,
                    token.clone(),
                    region,
                    rso_platform_id,
                    cmd_args,
                ),
                ux_exe_path,
            });
        }
        results
    }
}

fn is_ux_executable_name(name: &OsStr) -> bool {
    Path::new(name)
        .file_stem()
        .and_then(OsStr::to_str)
        .is_some_and(|stem| stem.eq_ignore_ascii_case(UX_PROCESS_STEM))
}

// Windows UI labels can differ from the executable image name, so identity is resolved from
// every process source already available to the detector instead of relying on one label.
fn is_ux_process(process: &Process) -> bool {
    is_ux_executable_name(process.name())
        || process
            .exe()
            .and_then(Path::file_name)
            .is_some_and(is_ux_executable_name)
        || process
            .cmd()
            .first()
            .is_some_and(|executable| is_ux_executable_name(executable.as_os_str()))
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
