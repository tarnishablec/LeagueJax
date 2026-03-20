use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::AppError;

#[derive(TS, Serialize, Deserialize, Debug, Clone)]
#[ts(export, export_to = "lcu.ts")]
#[serde(rename_all = "camelCase")]
pub struct TencentLeagueClientCmdArgs {
    pub region: String,
    pub locale: String,
    #[serde(rename = "rso_platform_id")]
    pub rso_platform_id: String,
    #[serde(rename = "rso-auth.url")]
    pub rso_auth_url: String,
    #[serde(rename = "rso-auth.client")]
    pub rso_auth_client: String,
    #[serde(rename = "riotclient-auth-token")]
    pub riotclient_auth_token: String,
    #[serde(rename = "riotclient-app-port")]
    pub riotclient_app_port: u16,
    #[serde(rename = "remoting-auth-token")]
    pub remoting_auth_token: String,
    #[serde(rename = "app-port")]
    pub app_port: u16,
    #[serde(rename = "install-directory")]
    pub install_directory: String,
    #[serde(rename = "app-name")]
    pub app_name: String,
    #[serde(rename = "ux-name")]
    pub ux_name: String,
    #[serde(rename = "ux-helper-name")]
    pub ux_helper_name: String,
    #[serde(rename = "log-dir")]
    pub log_dir: String,
    #[serde(rename = "crash-reporting")]
    pub crash_reporting: String,
    #[serde(rename = "crash-environment")]
    pub crash_environment: String,
    #[serde(rename = "app-log-file-path")]
    pub app_log_file_path: String,
    #[serde(rename = "app-pid")]
    pub app_pid: u32,
    #[serde(rename = "output-base-dir")]
    pub output_base_dir: String,
    #[serde(rename = "no-rads")]
    pub no_rads: bool,
    #[serde(rename = "disable-self-update")]
    pub disable_self_update: bool,
    #[serde(rename = "no-proxy-server")]
    pub no_proxy_server: bool,
    #[serde(rename = "ignore-certificate-errors")]
    pub ignore_certificate_errors: bool,
    #[serde(rename = "riotclient-tencent")]
    pub riotclient_tencent: bool,
    #[serde(rename = "t.lcdshost")]
    pub t_lcdshost: String,
    #[serde(rename = "t.chathost")]
    pub t_chathost: String,
    #[serde(rename = "t.storeurl")]
    pub t_storeurl: String,
    #[serde(rename = "t.rmsurl")]
    pub t_rmsurl: String,
    #[serde(rename = "t.location")]
    pub t_location: String,
    #[serde(rename = "tglog-endpoint")]
    pub tglog_endpoint: String,
    pub ccs: String,
    #[serde(rename = "entitlements-url")]
    pub entitlements_url: String,
    #[serde(rename = "dradis-endpoint")]
    pub dradis_endpoint: String,
    #[serde(rename = "tDALauncher")]
    pub t_da_launcher: bool,
}

#[derive(TS, Serialize, Deserialize, Debug, Clone)]
#[ts(export, export_to = "lcu.ts")]
#[serde(rename_all = "camelCase")]
pub struct RiotLeagueClientCmdArgs {
    pub region: String,
    pub locale: String,
    #[serde(rename = "riotclient-auth-token")]
    pub riotclient_auth_token: String,
    #[serde(rename = "riotclient-app-port")]
    pub riotclient_app_port: u16,
    #[serde(rename = "remoting-auth-token")]
    pub remoting_auth_token: String,
    #[serde(rename = "app-port")]
    pub app_port: u16,
    #[serde(rename = "install-directory")]
    pub install_directory: String,
    #[serde(rename = "app-name")]
    pub app_name: String,
    #[serde(rename = "ux-name")]
    pub ux_name: String,
    #[serde(rename = "ux-helper-name")]
    pub ux_helper_name: String,
    #[serde(rename = "log-dir")]
    pub log_dir: String,
    #[serde(rename = "crash-reporting")]
    pub crash_reporting: String,
    #[serde(rename = "crash-environment")]
    pub crash_environment: String,
    #[serde(rename = "app-log-file-path")]
    pub app_log_file_path: String,
    #[serde(rename = "app-pid")]
    pub app_pid: u32,
    #[serde(rename = "output-base-dir")]
    pub output_base_dir: String,
    #[serde(rename = "no-rads")]
    pub no_rads: bool,
    #[serde(rename = "disable-self-update")]
    pub disable_self_update: bool,
    #[serde(rename = "no-proxy-server")]
    pub no_proxy_server: bool,
    #[serde(rename = "ignore-certificate-errors")]
    pub ignore_certificate_errors: bool,
    #[serde(rename = "riotgamesapi-standalone")]
    pub riotgamesapi_standalone: bool,
    #[serde(rename = "riotgamesapi-settings")]
    pub riotgamesapi_settings: String,
    #[serde(rename = "rga-lite")]
    pub rga_lite: bool,
    #[serde(rename = "respawn-command")]
    pub respawn_command: String,
    #[serde(rename = "respawn-display-name")]
    pub respawn_display_name: String,
}

#[allow(clippy::large_enum_variant)]
#[derive(TS, Serialize, Deserialize, Debug, Clone)]
#[ts(export, export_to = "lcu.ts")]
#[serde(tag = "family", rename_all = "snake_case")]
pub enum LeagueClientCmdArgs {
    Tencent(TencentLeagueClientCmdArgs),
    Riot(RiotLeagueClientCmdArgs),
}

fn parse_bool_flag(value: Option<&str>) -> bool {
    let Some(value) = value else {
        return true;
    };
    let normalized = value.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        return true;
    }
    !matches!(normalized.as_str(), "0" | "false" | "off" | "no")
}

fn normalize_arg_key(key: &str) -> String {
    let mut normalized = String::new();
    let mut previous_was_separator = false;

    for current in key.trim().chars() {
        let mapped = if current == '-' || current == '.' {
            '_'
        } else {
            current
        };

        if mapped == '_' {
            if !previous_was_separator {
                normalized.push(mapped);
                previous_was_separator = true;
            }
            continue;
        }

        if mapped.is_ascii_alphanumeric() {
            normalized.push(mapped.to_ascii_lowercase());
            previous_was_separator = false;
        }
    }

    normalized.trim_matches('_').to_string()
}

fn parse_arg_pair(arg: &str) -> Option<(String, Option<String>)> {
    if !arg.starts_with("--") {
        return None;
    }

    let raw = arg.trim_start_matches("--");
    let (key, value) = if let Some((key, value)) = raw.split_once('=') {
        (key.to_string(), Some(value.to_string()))
    } else {
        (raw.to_string(), None)
    };

    let normalized_key = normalize_arg_key(&key);
    if normalized_key.is_empty() {
        return None;
    }

    Some((normalized_key, value))
}

fn get_optional_string(values: &HashMap<String, Option<String>>, keys: &[&str]) -> Option<String> {
    for key in keys {
        if let Some(value) = values.get(*key) {
            return value.clone().and_then(|value| {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            });
        }
    }
    None
}

fn get_required_string(
    values: &HashMap<String, Option<String>>,
    keys: &[&str],
    field: &str,
    allow_empty: bool,
) -> Result<String, AppError> {
    for key in keys {
        if let Some(value) = values.get(*key) {
            let Some(value) = value.clone() else {
                return Err(AppError::Other(format!(
                    "Missing value for required cmd arg `{field}`"
                )));
            };
            let trimmed = value.trim().to_string();
            if !allow_empty && trimmed.is_empty() {
                return Err(AppError::Other(format!(
                    "Empty value for required cmd arg `{field}`"
                )));
            }
            return if allow_empty { Ok(value) } else { Ok(trimmed) };
        }
    }
    Err(AppError::Other(format!(
        "Missing required cmd arg `{field}`"
    )))
}

fn get_required_u16(
    values: &HashMap<String, Option<String>>,
    keys: &[&str],
    field: &str,
) -> Result<u16, AppError> {
    let value = get_required_string(values, keys, field, false)?;
    value.parse::<u16>().map_err(|_| {
        AppError::Other(format!(
            "Invalid u16 value for required cmd arg `{field}`: {value}"
        ))
    })
}

fn get_required_u32(
    values: &HashMap<String, Option<String>>,
    keys: &[&str],
    field: &str,
) -> Result<u32, AppError> {
    let value = get_required_string(values, keys, field, false)?;
    value.parse::<u32>().map_err(|_| {
        AppError::Other(format!(
            "Invalid u32 value for required cmd arg `{field}`: {value}"
        ))
    })
}

fn get_optional_flag(values: &HashMap<String, Option<String>>, keys: &[&str]) -> bool {
    for key in keys {
        if let Some(value) = values.get(*key) {
            return parse_bool_flag(value.as_deref());
        }
    }
    false
}

fn get_required_flag(
    values: &HashMap<String, Option<String>>,
    keys: &[&str],
    field: &str,
) -> Result<bool, AppError> {
    for key in keys {
        if let Some(value) = values.get(*key) {
            return Ok(parse_bool_flag(value.as_deref()));
        }
    }
    Err(AppError::Other(format!(
        "Missing required cmd arg `{field}`"
    )))
}

pub fn parse_league_client_cmd_args(raw_cmdline: String) -> Result<LeagueClientCmdArgs, AppError> {
    let args = crate::utils::cmd::parse_cmdline_to_args(&raw_cmdline);
    let values: HashMap<String, Option<String>> =
        args.iter().filter_map(|arg| parse_arg_pair(arg)).collect();

    let is_tencent = get_optional_string(&values, &["region"])
        .as_ref()
        .is_some_and(|value| value.eq_ignore_ascii_case("TENCENT"))
        || get_optional_flag(&values, &["riotclient_tencent"])
        || get_optional_string(&values, &["t_lcdshost"]).is_some()
        || get_optional_string(&values, &["t_location"]).is_some();

    if is_tencent {
        return Ok(LeagueClientCmdArgs::Tencent(TencentLeagueClientCmdArgs {
            region: get_required_string(&values, &["region"], "region", false)?,
            locale: get_required_string(&values, &["locale"], "locale", false)?,
            rso_platform_id: get_required_string(
                &values,
                &["rso_platform_id"],
                "rso_platform_id",
                false,
            )?,
            rso_auth_url: get_required_string(
                &values,
                &["rso_auth_url"],
                "rso-auth.url",
                false,
            )?,
            rso_auth_client: get_required_string(
                &values,
                &["rso_auth_client"],
                "rso-auth.client",
                false,
            )?,
            riotclient_auth_token: get_required_string(
                &values,
                &["riotclient_auth_token"],
                "riotclient-auth-token",
                false,
            )?,
            riotclient_app_port: get_required_u16(
                &values,
                &["riotclient_app_port"],
                "riotclient-app-port",
            )?,
            remoting_auth_token: get_required_string(
                &values,
                &["remoting_auth_token"],
                "remoting-auth-token",
                false,
            )?,
            app_port: get_required_u16(&values, &["app_port"], "app-port")?,
            install_directory: get_required_string(
                &values,
                &["install_directory"],
                "install-directory",
                false,
            )?,
            app_name: get_required_string(&values, &["app_name"], "app-name", false)?,
            ux_name: get_required_string(&values, &["ux_name"], "ux-name", false)?,
            ux_helper_name: get_required_string(
                &values,
                &["ux_helper_name"],
                "ux-helper-name",
                false,
            )?,
            log_dir: get_required_string(&values, &["log_dir"], "log-dir", false)?,
            crash_reporting: get_required_string(
                &values,
                &["crash_reporting"],
                "crash-reporting",
                true,
            )?,
            crash_environment: get_required_string(
                &values,
                &["crash_environment"],
                "crash-environment",
                false,
            )?,
            app_log_file_path: get_required_string(
                &values,
                &["app_log_file_path"],
                "app-log-file-path",
                false,
            )?,
            app_pid: get_required_u32(&values, &["app_pid"], "app-pid")?,
            output_base_dir: get_required_string(
                &values,
                &["output_base_dir"],
                "output-base-dir",
                false,
            )?,
            no_rads: get_required_flag(&values, &["no_rads"], "no-rads")?,
            disable_self_update: get_required_flag(
                &values,
                &["disable_self_update"],
                "disable-self-update",
            )?,
            no_proxy_server: get_required_flag(
                &values,
                &["no_proxy_server"],
                "no-proxy-server",
            )?,
            ignore_certificate_errors: get_required_flag(
                &values,
                &["ignore_certificate_errors"],
                "ignore-certificate-errors",
            )?,
            riotclient_tencent: get_required_flag(
                &values,
                &["riotclient_tencent"],
                "riotclient-tencent",
            )?,
            t_lcdshost: get_required_string(&values, &["t_lcdshost"], "t.lcdshost", false)?,
            t_chathost: get_required_string(&values, &["t_chathost"], "t.chathost", false)?,
            t_storeurl: get_required_string(&values, &["t_storeurl"], "t.storeurl", false)?,
            t_rmsurl: get_required_string(&values, &["t_rmsurl"], "t.rmsurl", false)?,
            t_location: get_required_string(&values, &["t_location"], "t.location", false)?,
            tglog_endpoint: get_required_string(
                &values,
                &["tglog_endpoint"],
                "tglog-endpoint",
                false,
            )?,
            ccs: get_required_string(&values, &["ccs"], "ccs", false)?,
            entitlements_url: get_required_string(
                &values,
                &["entitlements_url"],
                "entitlements-url",
                false,
            )?,
            dradis_endpoint: get_required_string(
                &values,
                &["dradis_endpoint"],
                "dradis-endpoint",
                false,
            )?,
            t_da_launcher: get_required_flag(
                &values,
                &["tdalauncher", "t_da_launcher"],
                "tDALauncher",
            )?,
        }));
    }

    Ok(LeagueClientCmdArgs::Riot(RiotLeagueClientCmdArgs {
        region: get_required_string(&values, &["region"], "region", false)?,
        locale: get_required_string(&values, &["locale"], "locale", false)?,
        riotclient_auth_token: get_required_string(
            &values,
            &["riotclient_auth_token"],
            "riotclient-auth-token",
            false,
        )?,
        riotclient_app_port: get_required_u16(
            &values,
            &["riotclient_app_port"],
            "riotclient-app-port",
        )?,
        remoting_auth_token: get_required_string(
            &values,
            &["remoting_auth_token"],
            "remoting-auth-token",
            false,
        )?,
        app_port: get_required_u16(&values, &["app_port"], "app-port")?,
        install_directory: get_required_string(
            &values,
            &["install_directory"],
            "install-directory",
            false,
        )?,
        app_name: get_required_string(&values, &["app_name"], "app-name", false)?,
        ux_name: get_required_string(&values, &["ux_name"], "ux-name", false)?,
        ux_helper_name: get_required_string(
            &values,
            &["ux_helper_name"],
            "ux-helper-name",
            false,
        )?,
        log_dir: get_required_string(&values, &["log_dir"], "log-dir", false)?,
        crash_reporting: get_required_string(&values, &["crash_reporting"], "crash-reporting", true)?,
        crash_environment: get_required_string(
            &values,
            &["crash_environment"],
            "crash-environment",
            false,
        )?,
        app_log_file_path: get_required_string(
            &values,
            &["app_log_file_path"],
            "app-log-file-path",
            false,
        )?,
        app_pid: get_required_u32(&values, &["app_pid"], "app-pid")?,
        output_base_dir: get_required_string(
            &values,
            &["output_base_dir"],
            "output-base-dir",
            false,
        )?,
        no_rads: get_required_flag(&values, &["no_rads"], "no-rads")?,
        disable_self_update: get_required_flag(
            &values,
            &["disable_self_update"],
            "disable-self-update",
        )?,
        no_proxy_server: get_required_flag(
            &values,
            &["no_proxy_server"],
            "no-proxy-server",
        )?,
        ignore_certificate_errors: get_required_flag(
            &values,
            &["ignore_certificate_errors"],
            "ignore-certificate-errors",
        )?,
        riotgamesapi_standalone: get_required_flag(
            &values,
            &["riotgamesapi_standalone"],
            "riotgamesapi-standalone",
        )?,
        riotgamesapi_settings: get_required_string(
            &values,
            &["riotgamesapi_settings"],
            "riotgamesapi-settings",
            false,
        )?,
        rga_lite: get_required_flag(&values, &["rga_lite"], "rga-lite")?,
        respawn_command: get_required_string(
            &values,
            &["respawn_command"],
            "respawn-command",
            false,
        )?,
        respawn_display_name: get_required_string(
            &values,
            &["respawn_display_name"],
            "respawn-display-name",
            false,
        )?,
    }))
}
