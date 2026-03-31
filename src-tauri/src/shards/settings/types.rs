use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use ts_rs::TS;

#[derive(TS)]
#[ts(export, export_to = "settings.ts")]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SettingScopeDto {
    Frontend,
    Backend,
    Shared,
}

#[derive(TS)]
#[ts(export, export_to = "settings.ts")]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SettingOptionDto {
    pub value: String,
    pub label_key: String,
}

#[derive(TS)]
#[ts(export, export_to = "settings.ts")]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SettingControlDto {
    Select,
    Toggle,
    Text {
        placeholder_key: Option<String>,
    },
    Number {
        placeholder_key: Option<String>,
        min: Option<f64>,
        max: Option<f64>,
        step: Option<f64>,
    },
}

#[derive(TS)]
#[ts(export, export_to = "settings.ts")]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SettingDefinitionDto {
    pub id: String,
    pub label_key: String,
    pub scope: SettingScopeDto,
    pub control: SettingControlDto,
    #[ts(type = "unknown")]
    pub default_value: Value,
    pub order: Option<i32>,
    pub visible: Option<bool>,
    pub options: Option<Vec<SettingOptionDto>>,
}

#[derive(TS)]
#[ts(export, export_to = "settings.ts")]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SettingsSnapshotDto {
    #[ts(type = "{ [key: string]: unknown }")]
    pub values: BTreeMap<String, Value>,
}

#[derive(TS)]
#[ts(export, export_to = "settings.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsBootstrapDto {
    pub definitions: Vec<SettingDefinitionDto>,
    pub snapshot: SettingsSnapshotDto,
}

#[derive(TS)]
#[ts(export, export_to = "settings.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsChangedEventDto {
    #[ts(type = "{ [key: string]: unknown }")]
    pub changes: BTreeMap<String, Value>,
    pub source: Option<String>,
}
