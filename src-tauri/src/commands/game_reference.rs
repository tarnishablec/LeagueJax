use std::sync::Arc;

use jax::Jax;
use serde::Serialize;
use serde_json::Value;
use tauri::State;

use crate::error::AppError;
use crate::shards::lcu::asset_proxy::resolve_lcu_asset_path;
use crate::shards::lcu::LcuShard;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuStaticJsonTableDto {
    pub table_id: String,
    pub path: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuStaticJsonPathEscapeHatchDto {
    pub accepted_path_pattern: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuStaticJsonTablesResponse {
    pub tables: Vec<LcuStaticJsonTableDto>,
    pub path_escape_hatch: LcuStaticJsonPathEscapeHatchDto,
}

struct LcuStaticJsonTableSpec {
    table_id: &'static str,
    path: &'static str,
    description: &'static str,
}

const LCU_STATIC_JSON_TABLES: &[LcuStaticJsonTableSpec] = &[
    LcuStaticJsonTableSpec {
        table_id: "items",
        path: "/lol-game-data/assets/v1/items.json",
        description: "Item metadata including names, prices, tags, stats, and mode restrictions.",
    },
    LcuStaticJsonTableSpec {
        table_id: "champions",
        path: "/lol-game-data/assets/v1/champion-summary.json",
        description: "Champion summary metadata keyed by champion ids and aliases.",
    },
    LcuStaticJsonTableSpec {
        table_id: "summonerSpells",
        path: "/lol-game-data/assets/v1/summoner-spells.json",
        description: "Summoner spell metadata including ids, names, descriptions, and modes.",
    },
    LcuStaticJsonTableSpec {
        table_id: "perks",
        path: "/lol-game-data/assets/v1/perks.json",
        description: "Rune and stat shard metadata used by match participant perk ids.",
    },
    LcuStaticJsonTableSpec {
        table_id: "perkStyles",
        path: "/lol-game-data/assets/v1/perkstyles.json",
        description: "Rune style tree metadata used to group perk ids.",
    },
    LcuStaticJsonTableSpec {
        table_id: "queues",
        path: "/lol-game-data/assets/v1/queues.json",
        description: "Queue metadata used to interpret queue ids in match history.",
    },
    LcuStaticJsonTableSpec {
        table_id: "maps",
        path: "/lol-game-data/assets/v1/maps.json",
        description: "Map metadata used to interpret map ids and game modes.",
    },
    LcuStaticJsonTableSpec {
        table_id: "cherryAugments",
        path: "/lol-game-data/assets/v1/cherry-augments.json",
        description: "Arena augment metadata used by player augment ids.",
    },
];

#[tauri::command]
pub fn list_lcu_static_json_tables() -> Result<LcuStaticJsonTablesResponse, AppError> {
    Ok(lcu_static_json_tables_response())
}

#[tauri::command]
pub async fn get_lcu_static_json(
    table_id: Option<String>,
    path: Option<String>,
    jax: State<'_, Arc<Jax>>,
) -> Result<Value, AppError> {
    let path = resolve_lcu_static_json_request(table_id.as_deref(), path.as_deref())?;
    let manager = jax
        .get_shard::<LcuShard>()
        .manager()
        .ok_or(AppError::LcuNotConnected)?;
    let lcu = manager.focused().await.ok_or(AppError::LcuNotConnected)?;

    lcu.api().get_asset_json(&path).await
}

pub fn lcu_static_json_result_label(table_id: Option<&str>, path: Option<&str>) -> String {
    match (normalize_optional(table_id), normalize_optional(path)) {
        (Some(table_id), None) => format!("get_lcu_static_json:{table_id}"),
        (None, Some(path)) => format!("get_lcu_static_json:{path}"),
        _ => "get_lcu_static_json".to_string(),
    }
}

fn lcu_static_json_tables_response() -> LcuStaticJsonTablesResponse {
    LcuStaticJsonTablesResponse {
        tables: LCU_STATIC_JSON_TABLES
            .iter()
            .map(|table| LcuStaticJsonTableDto {
                table_id: table.table_id.to_string(),
                path: table.path.to_string(),
                description: table.description.to_string(),
            })
            .collect(),
        path_escape_hatch: LcuStaticJsonPathEscapeHatchDto {
            accepted_path_pattern: "/lol-game-data/assets/**/*.json".to_string(),
            description: "Use only for LCU static JSON assets that are not listed as known tables."
                .to_string(),
        },
    }
}

fn resolve_lcu_static_json_request(
    table_id: Option<&str>,
    path: Option<&str>,
) -> Result<String, AppError> {
    match (normalize_optional(table_id), normalize_optional(path)) {
        (Some(table_id), None) => {
            let table = LCU_STATIC_JSON_TABLES
                .iter()
                .find(|table| table.table_id == table_id)
                .ok_or_else(|| {
                    AppError::other(format!("Unknown LCU static JSON table: {table_id}"))
                })?;
            Ok(table.path.to_string())
        }
        (None, Some(path)) => resolve_lcu_static_json_path(path),
        (Some(_), Some(_)) => Err(AppError::other(
            "get_lcu_static_json accepts either tableId or path, not both",
        )),
        (None, None) => Err(AppError::other(
            "get_lcu_static_json requires either tableId or path",
        )),
    }
}

// This keeps the MCP escape hatch scoped to static JSON assets instead of turning it into a generic LCU API reader.
fn resolve_lcu_static_json_path(path: &str) -> Result<String, AppError> {
    let resolved = resolve_lcu_asset_path(None, path).map_err(|error| {
        AppError::other(format!("Invalid LCU static JSON path: {}", error.message()))
    })?;

    if !resolved.to_ascii_lowercase().ends_with(".json") {
        return Err(AppError::other(
            "LCU static JSON path must point to a .json file under /lol-game-data/assets",
        ));
    }

    Ok(resolved)
}

fn normalize_optional(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

#[cfg(test)]
mod tests {
    use super::{
        lcu_static_json_tables_response, resolve_lcu_static_json_path,
        resolve_lcu_static_json_request,
    };

    fn error_message<T>(result: Result<T, crate::error::AppError>) -> String {
        match result {
            Ok(_) => String::new(),
            Err(error) => error.to_string(),
        }
    }

    #[test]
    fn table_catalog_includes_core_match_reference_tables() {
        let response = lcu_static_json_tables_response();
        let table_ids = response
            .tables
            .iter()
            .map(|table| table.table_id.as_str())
            .collect::<Vec<_>>();

        assert!(table_ids.contains(&"items"));
        assert!(table_ids.contains(&"summonerSpells"));
        assert!(table_ids.contains(&"perks"));
        assert!(table_ids.contains(&"queues"));
        assert!(table_ids.contains(&"cherryAugments"));
    }

    #[test]
    fn resolves_known_table_id_to_static_json_path() -> Result<(), String> {
        let path = resolve_lcu_static_json_request(Some("items"), None)
            .map_err(|error| error.to_string())?;

        assert_eq!(path, "/lol-game-data/assets/v1/items.json");
        Ok(())
    }

    #[test]
    fn resolves_prefixed_lcu_asset_json_path() -> Result<(), String> {
        let path =
            resolve_lcu_static_json_path("/league-client/lol-game-data/assets/v1/items.json")
                .map_err(|error| error.to_string())?;

        assert_eq!(path, "/lol-game-data/assets/v1/items.json");
        Ok(())
    }

    #[test]
    fn rejects_non_json_lcu_asset_path() {
        let message = error_message(resolve_lcu_static_json_path(
            "/lol-game-data/assets/v1/profile-icons/29.jpg",
        ));

        assert!(message.contains("must point to a .json file"));
    }

    #[test]
    fn rejects_non_asset_lcu_endpoint_path() {
        let message = error_message(resolve_lcu_static_json_path(
            "/lol-summoner/v1/current-summoner",
        ));

        assert!(message.contains("Only /lol-game-data/assets/* is allowed"));
    }

    #[test]
    fn rejects_ambiguous_table_id_and_path_request() {
        let message = error_message(resolve_lcu_static_json_request(
            Some("items"),
            Some("/lol-game-data/assets/v1/items.json"),
        ));

        assert!(message.contains("either tableId or path, not both"));
    }
}
