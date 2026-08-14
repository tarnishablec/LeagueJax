use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(TS, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[ts(export, export_to = "lcu.ts")]
#[serde(rename_all = "camelCase")]
pub struct TencentLeagueClientCmdArgs {
    pub region: Option<String>,
    pub locale: Option<String>,
    #[serde(rename = "rso_platform_id")]
    pub rso_platform_id: Option<String>,
    #[serde(rename = "rso-auth.url")]
    pub rso_auth_url: Option<String>,
    #[serde(rename = "rso-auth.client")]
    pub rso_auth_client: Option<String>,
    #[serde(rename = "riotclient-auth-token")]
    pub riotclient_auth_token: Option<String>,
    #[serde(rename = "riotclient-app-port")]
    pub riotclient_app_port: Option<u16>,
    #[serde(rename = "remoting-auth-token")]
    pub remoting_auth_token: Option<String>,
    #[serde(rename = "app-port")]
    pub app_port: Option<u16>,
    #[serde(rename = "install-directory")]
    pub install_directory: Option<String>,
    #[serde(rename = "app-name")]
    pub app_name: Option<String>,
    #[serde(rename = "ux-name")]
    pub ux_name: Option<String>,
    #[serde(rename = "ux-helper-name")]
    pub ux_helper_name: Option<String>,
    #[serde(rename = "log-dir")]
    pub log_dir: Option<String>,
    #[serde(rename = "crash-reporting")]
    pub crash_reporting: Option<String>,
    #[serde(rename = "crash-environment")]
    pub crash_environment: Option<String>,
    #[serde(rename = "app-log-file-path")]
    pub app_log_file_path: Option<String>,
    #[serde(rename = "app-pid")]
    pub app_pid: Option<u32>,
    #[serde(rename = "output-base-dir")]
    pub output_base_dir: Option<String>,
    #[serde(rename = "no-rads")]
    pub no_rads: Option<bool>,
    #[serde(rename = "disable-self-update")]
    pub disable_self_update: Option<bool>,
    #[serde(rename = "no-proxy-server")]
    pub no_proxy_server: Option<bool>,
    #[serde(rename = "ignore-certificate-errors")]
    pub ignore_certificate_errors: Option<bool>,
    #[serde(rename = "riotclient-tencent")]
    pub riotclient_tencent: Option<bool>,
    #[serde(rename = "t.lcdshost")]
    pub t_lcdshost: Option<String>,
    #[serde(rename = "t.chathost")]
    pub t_chathost: Option<String>,
    #[serde(rename = "t.storeurl")]
    pub t_storeurl: Option<String>,
    #[serde(rename = "t.rmsurl")]
    pub t_rmsurl: Option<String>,
    #[serde(rename = "t.location")]
    pub t_location: Option<String>,
    #[serde(rename = "tglog-endpoint")]
    pub tglog_endpoint: Option<String>,
    pub ccs: Option<String>,
    #[serde(rename = "entitlements-url")]
    pub entitlements_url: Option<String>,
    #[serde(rename = "dradis-endpoint")]
    pub dradis_endpoint: Option<String>,
    #[serde(rename = "tDALauncher")]
    pub t_da_launcher: Option<bool>,
}

#[derive(TS, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[ts(export, export_to = "lcu.ts")]
#[serde(rename_all = "camelCase")]
pub struct RiotLeagueClientCmdArgs {
    pub region: Option<String>,
    pub locale: Option<String>,
    #[serde(rename = "riotclient-auth-token")]
    pub riotclient_auth_token: Option<String>,
    #[serde(rename = "riotclient-app-port")]
    pub riotclient_app_port: Option<u16>,
    #[serde(rename = "remoting-auth-token")]
    pub remoting_auth_token: Option<String>,
    #[serde(rename = "app-port")]
    pub app_port: Option<u16>,
    #[serde(rename = "install-directory")]
    pub install_directory: Option<String>,
    #[serde(rename = "app-name")]
    pub app_name: Option<String>,
    #[serde(rename = "ux-name")]
    pub ux_name: Option<String>,
    #[serde(rename = "ux-helper-name")]
    pub ux_helper_name: Option<String>,
    #[serde(rename = "log-dir")]
    pub log_dir: Option<String>,
    #[serde(rename = "crash-reporting")]
    pub crash_reporting: Option<String>,
    #[serde(rename = "crash-environment")]
    pub crash_environment: Option<String>,
    #[serde(rename = "app-log-file-path")]
    pub app_log_file_path: Option<String>,
    #[serde(rename = "app-pid")]
    pub app_pid: Option<u32>,
    #[serde(rename = "output-base-dir")]
    pub output_base_dir: Option<String>,
    #[serde(rename = "no-rads")]
    pub no_rads: Option<bool>,
    #[serde(rename = "disable-self-update")]
    pub disable_self_update: Option<bool>,
    #[serde(rename = "no-proxy-server")]
    pub no_proxy_server: Option<bool>,
    #[serde(rename = "ignore-certificate-errors")]
    pub ignore_certificate_errors: Option<bool>,
    #[serde(rename = "riotgamesapi-standalone")]
    pub riotgamesapi_standalone: Option<bool>,
    #[serde(rename = "riotgamesapi-settings")]
    pub riotgamesapi_settings: Option<String>,
    #[serde(rename = "rga-lite")]
    pub rga_lite: Option<bool>,
    #[serde(rename = "respawn-command")]
    pub respawn_command: Option<String>,
    #[serde(rename = "respawn-display-name")]
    pub respawn_display_name: Option<String>,
}

#[allow(clippy::large_enum_variant)]
#[derive(TS, Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
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

fn get_optional_u16(values: &HashMap<String, Option<String>>, keys: &[&str]) -> Option<u16> {
    get_optional_string(values, keys).and_then(|value| value.parse::<u16>().ok())
}

fn get_optional_u32(values: &HashMap<String, Option<String>>, keys: &[&str]) -> Option<u32> {
    get_optional_string(values, keys).and_then(|value| value.parse::<u32>().ok())
}

fn get_optional_flag(values: &HashMap<String, Option<String>>, keys: &[&str]) -> Option<bool> {
    for key in keys {
        if let Some(value) = values.get(*key) {
            return Some(parse_bool_flag(value.as_deref()));
        }
    }
    None
}

/// League launch arguments change independently of the local API contract, so every captured
/// value stays optional and the detector decides which fields are required for connectivity.
pub fn parse_league_client_args(args: &[String]) -> LeagueClientCmdArgs {
    let values: HashMap<String, Option<String>> =
        args.iter().filter_map(|arg| parse_arg_pair(arg)).collect();

    let is_tencent = get_optional_string(&values, &["region"])
        .as_ref()
        .is_some_and(|value| value.eq_ignore_ascii_case("TENCENT"))
        || get_optional_flag(&values, &["riotclient_tencent"]) == Some(true)
        || get_optional_string(&values, &["t_lcdshost"]).is_some()
        || get_optional_string(&values, &["t_location"]).is_some();

    if is_tencent {
        return LeagueClientCmdArgs::Tencent(TencentLeagueClientCmdArgs {
            region: get_optional_string(&values, &["region"]),
            locale: get_optional_string(&values, &["locale"]),
            rso_platform_id: get_optional_string(&values, &["rso_platform_id"]),
            rso_auth_url: get_optional_string(&values, &["rso_auth_url"]),
            rso_auth_client: get_optional_string(&values, &["rso_auth_client"]),
            riotclient_auth_token: get_optional_string(&values, &["riotclient_auth_token"]),
            riotclient_app_port: get_optional_u16(&values, &["riotclient_app_port"]),
            remoting_auth_token: get_optional_string(&values, &["remoting_auth_token"]),
            app_port: get_optional_u16(&values, &["app_port"]),
            install_directory: get_optional_string(&values, &["install_directory"]),
            app_name: get_optional_string(&values, &["app_name"]),
            ux_name: get_optional_string(&values, &["ux_name"]),
            ux_helper_name: get_optional_string(&values, &["ux_helper_name"]),
            log_dir: get_optional_string(&values, &["log_dir"]),
            crash_reporting: get_optional_string(&values, &["crash_reporting"]),
            crash_environment: get_optional_string(&values, &["crash_environment"]),
            app_log_file_path: get_optional_string(&values, &["app_log_file_path"]),
            app_pid: get_optional_u32(&values, &["app_pid"]),
            output_base_dir: get_optional_string(&values, &["output_base_dir"]),
            no_rads: get_optional_flag(&values, &["no_rads"]),
            disable_self_update: get_optional_flag(&values, &["disable_self_update"]),
            no_proxy_server: get_optional_flag(&values, &["no_proxy_server"]),
            ignore_certificate_errors: get_optional_flag(&values, &["ignore_certificate_errors"]),
            riotclient_tencent: get_optional_flag(&values, &["riotclient_tencent"]),
            t_lcdshost: get_optional_string(&values, &["t_lcdshost"]),
            t_chathost: get_optional_string(&values, &["t_chathost"]),
            t_storeurl: get_optional_string(&values, &["t_storeurl"]),
            t_rmsurl: get_optional_string(&values, &["t_rmsurl"]),
            t_location: get_optional_string(&values, &["t_location"]),
            tglog_endpoint: get_optional_string(&values, &["tglog_endpoint"]),
            ccs: get_optional_string(&values, &["ccs"]),
            entitlements_url: get_optional_string(&values, &["entitlements_url"]),
            dradis_endpoint: get_optional_string(&values, &["dradis_endpoint"]),
            t_da_launcher: get_optional_flag(&values, &["tdalauncher", "t_da_launcher"]),
        });
    }

    LeagueClientCmdArgs::Riot(RiotLeagueClientCmdArgs {
        region: get_optional_string(&values, &["region"]),
        locale: get_optional_string(&values, &["locale"]),
        riotclient_auth_token: get_optional_string(&values, &["riotclient_auth_token"]),
        riotclient_app_port: get_optional_u16(&values, &["riotclient_app_port"]),
        remoting_auth_token: get_optional_string(&values, &["remoting_auth_token"]),
        app_port: get_optional_u16(&values, &["app_port"]),
        install_directory: get_optional_string(&values, &["install_directory"]),
        app_name: get_optional_string(&values, &["app_name"]),
        ux_name: get_optional_string(&values, &["ux_name"]),
        ux_helper_name: get_optional_string(&values, &["ux_helper_name"]),
        log_dir: get_optional_string(&values, &["log_dir"]),
        crash_reporting: get_optional_string(&values, &["crash_reporting"]),
        crash_environment: get_optional_string(&values, &["crash_environment"]),
        app_log_file_path: get_optional_string(&values, &["app_log_file_path"]),
        app_pid: get_optional_u32(&values, &["app_pid"]),
        output_base_dir: get_optional_string(&values, &["output_base_dir"]),
        no_rads: get_optional_flag(&values, &["no_rads"]),
        disable_self_update: get_optional_flag(&values, &["disable_self_update"]),
        no_proxy_server: get_optional_flag(&values, &["no_proxy_server"]),
        ignore_certificate_errors: get_optional_flag(&values, &["ignore_certificate_errors"]),
        riotgamesapi_standalone: get_optional_flag(&values, &["riotgamesapi_standalone"]),
        riotgamesapi_settings: get_optional_string(&values, &["riotgamesapi_settings"]),
        rga_lite: get_optional_flag(&values, &["rga_lite"]),
        respawn_command: get_optional_string(&values, &["respawn_command"]),
        respawn_display_name: get_optional_string(&values, &["respawn_display_name"]),
    })
}

pub fn parse_league_client_cmd_args(raw_cmdline: &str) -> LeagueClientCmdArgs {
    let args = crate::utils::cmd::parse_cmdline_to_args(raw_cmdline);
    parse_league_client_args(&args)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_minimal_tencent_args_without_legacy_metadata() {
        let parsed = parse_league_client_cmd_args(
            r#"LeagueClientUx.exe --region=TENCENT --riotclient-tencent --app-port=54321 --remoting-auth-token=test-token"#,
        );

        let LeagueClientCmdArgs::Tencent(args) = parsed else {
            panic!("expected Tencent command args");
        };
        assert_eq!(args.region.as_deref(), Some("TENCENT"));
        assert_eq!(args.app_port, Some(54321));
        assert_eq!(args.remoting_auth_token.as_deref(), Some("test-token"));
        assert_eq!(args.locale, None);
        assert_eq!(args.tglog_endpoint, None);
    }

    #[test]
    fn preserves_missing_and_invalid_values_as_none() {
        let parsed = parse_league_client_cmd_args(
            r#"LeagueClientUx.exe --region=EUW --app-port=invalid --no-proxy-server=false"#,
        );

        let LeagueClientCmdArgs::Riot(args) = parsed else {
            panic!("expected Riot command args");
        };
        assert_eq!(args.region.as_deref(), Some("EUW"));
        assert_eq!(args.app_port, None);
        assert_eq!(args.remoting_auth_token, None);
        assert_eq!(args.no_proxy_server, Some(false));
    }
}
