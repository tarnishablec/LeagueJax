use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Emitter;
use ts_rs::TS;

pub const BACKEND_NOTIFICATION_REQUESTED_EVENT: &str = "backend_notification_requested";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "notifications.ts")]
#[serde(rename_all = "camelCase")]
pub enum BackendNotificationLevelDto {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "notifications.ts")]
#[serde(rename_all = "camelCase")]
pub enum BackendNotificationSystemModeDto {
    Off,
    RespectUserSetting,
    Force,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "notifications.ts")]
#[serde(rename_all = "camelCase")]
pub struct BackendNotificationRequestDto {
    pub source: String,
    pub level: BackendNotificationLevelDto,
    pub title_key: String,
    pub body_key: Option<String>,
    #[ts(type = "{ [key: string]: string | number | boolean }")]
    pub values: BTreeMap<String, Value>,
    pub dedupe_key: Option<String>,
    pub system: BackendNotificationSystemModeDto,
}

// Backend shards emit i18n-keyed requests; the frontend owns locale resolution and OS notification permissions.
pub fn request_backend_notification(
    app: &tauri::AppHandle,
    request: &BackendNotificationRequestDto,
) {
    if let Err(error) = app.emit(BACKEND_NOTIFICATION_REQUESTED_EVENT, request) {
        tracing::warn!(error = %error, "Failed to emit backend notification request");
    }
}
