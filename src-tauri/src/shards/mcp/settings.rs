use serde_json::Value;

use crate::error::AppError;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};

const MCP_PORT_SETTING_ID: &str = "mcp.server.port";
const MCP_TOGGLE_ACTION_SETTING_ID: &str = "mcp.server.toggle";
const MCP_DEFAULT_PORT: u16 = 31421;
const MIN_PORT: u16 = 1;
const MAX_PORT: u16 = u16::MAX;

pub(super) fn build_port_definition() -> SettingDefinitionDto {
    SettingDefinitionDto {
        id: MCP_PORT_SETTING_ID.to_string(),
        label_key: "settings.mcp.port.label".to_string(),
        hint_key: Some("settings.mcp.port.hint".to_string()),
        scope: SettingScopeDto::Backend,
        control: Some(SettingControlDto::Number {
            placeholder_key: None,
            min: Some(f64::from(MIN_PORT)),
            max: Some(f64::from(MAX_PORT)),
            step: Some(1.0),
        }),
        default_value: Value::Number(serde_json::Number::from(u64::from(MCP_DEFAULT_PORT))),
        order: Some(10),
        visible: Some(false),
        options: None,
    }
}

pub(super) fn build_toggle_action_definition() -> SettingDefinitionDto {
    SettingDefinitionDto {
        id: MCP_TOGGLE_ACTION_SETTING_ID.to_string(),
        label_key: "settings.mcp.toggle.label".to_string(),
        hint_key: Some("settings.mcp.toggle.hint".to_string()),
        scope: SettingScopeDto::Backend,
        control: Some(SettingControlDto::Action),
        default_value: Value::Null,
        order: Some(20),
        visible: Some(false),
        options: None,
    }
}

pub(super) fn port_from_value(value: &Value) -> Result<u16, AppError> {
    let port = value
        .as_u64()
        .and_then(|raw| u16::try_from(raw).ok())
        .or_else(|| {
            value.as_f64().and_then(|raw| {
                if !raw.is_finite() || raw.fract() != 0.0 {
                    return None;
                }
                if raw < f64::from(MIN_PORT) || raw > f64::from(MAX_PORT) {
                    return None;
                }
                Some(raw as u16)
            })
        });

    port.filter(|port| *port >= MIN_PORT)
        .ok_or_else(|| AppError::other("MCP port must be an integer between 1 and 65535"))
}
