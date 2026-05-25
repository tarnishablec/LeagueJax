use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Serialize;
use serde_json::{json, Value};
use time::OffsetDateTime;
use tokio::sync::Mutex;
use uuid::Uuid;

const PAYLOAD_TTL: Duration = Duration::from_secs(20 * 60);
const DEFAULT_QUERY_BUDGET_BYTES: usize = 64 * 1024;
const MAX_QUERY_BUDGET_BYTES: usize = 256 * 1024;
const MIN_QUERY_BUDGET_BYTES: usize = 1024;
const DEFAULT_SCHEMA_DEPTH: usize = 4;
const MAX_SCHEMA_DEPTH: usize = 8;
const DEFAULT_ARRAY_SAMPLE_SIZE: usize = 2;
const MAX_ARRAY_SAMPLE_SIZE: usize = 8;
const DEFAULT_OBJECT_KEY_LIMIT: usize = 80;
const MAX_OBJECT_KEY_LIMIT: usize = 240;

pub(in crate::shards::mcp) type McpJsonPayloadStore = Arc<Mutex<JsonPayloadStore>>;

#[derive(Default)]
pub(in crate::shards::mcp) struct JsonPayloadStore {
    payloads_by_session: HashMap<String, HashMap<String, StoredJsonPayload>>,
}

#[derive(Clone)]
struct StoredJsonPayload {
    value: Value,
    metadata: JsonPayloadMetadata,
    expires_at_instant: Instant,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct JsonPayloadMetadata {
    pub payload_id: String,
    pub label: Option<String>,
    pub created_at_ms: u64,
    pub expires_at_ms: u64,
    pub estimated_bytes: usize,
    pub root_type: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct JsonPayloadOpenResult {
    pub payload: JsonPayloadMetadata,
    pub pointer_syntax: &'static str,
    pub query_tool: &'static str,
    pub describe_tool: &'static str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct JsonPayloadDescription {
    pub payload: JsonPayloadMetadata,
    pub schema: Value,
    pub schema_depth: usize,
    pub array_sample_size: usize,
    pub object_key_limit: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct JsonPointerQueryResult {
    pub pointer: String,
    pub status: String,
    pub value_type: Option<String>,
    pub estimated_bytes: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(in crate::shards::mcp) struct JsonPointerQueryResponse {
    pub payload: JsonPayloadMetadata,
    pub budget_bytes: usize,
    pub used_bytes: usize,
    pub results: Vec<JsonPointerQueryResult>,
}

pub(in crate::shards::mcp) fn new_store() -> McpJsonPayloadStore {
    Arc::new(Mutex::new(JsonPayloadStore::default()))
}

pub(in crate::shards::mcp) async fn clear_payloads(store: &McpJsonPayloadStore) {
    store.lock().await.payloads_by_session.clear();
}

pub(in crate::shards::mcp) async fn put_payload(
    store: &McpJsonPayloadStore,
    session_id: &str,
    value: Value,
    label: Option<String>,
) -> Result<JsonPayloadOpenResult, String> {
    let created_at_ms = u64::try_from(OffsetDateTime::now_utc().unix_timestamp())
        .unwrap_or_default()
        .saturating_mul(1000);
    let metadata = JsonPayloadMetadata {
        payload_id: Uuid::new_v4().to_string(),
        label,
        created_at_ms,
        expires_at_ms: created_at_ms.saturating_add(PAYLOAD_TTL.as_millis() as u64),
        estimated_bytes: estimate_value_bytes(&value)?,
        root_type: value_type(&value).to_string(),
    };
    let payload_id = metadata.payload_id.clone();
    let stored = StoredJsonPayload {
        value,
        metadata: metadata.clone(),
        expires_at_instant: Instant::now() + PAYLOAD_TTL,
    };

    let mut guard = store.lock().await;
    prune_expired(&mut guard);
    guard
        .payloads_by_session
        .entry(session_id.to_string())
        .or_default()
        .insert(payload_id, stored);

    Ok(JsonPayloadOpenResult {
        payload: metadata,
        pointer_syntax: "RFC 6901 JSON Pointer",
        query_tool: "query_json_payload_pointers",
        describe_tool: "describe_json_payload",
    })
}

pub(in crate::shards::mcp) async fn list_payloads(
    store: &McpJsonPayloadStore,
    session_id: &str,
) -> Vec<JsonPayloadMetadata> {
    let mut guard = store.lock().await;
    prune_expired(&mut guard);
    guard
        .payloads_by_session
        .get(session_id)
        .into_iter()
        .flat_map(|payloads| payloads.values())
        .map(|payload| payload.metadata.clone())
        .collect()
}

pub(in crate::shards::mcp) async fn describe_payload(
    store: &McpJsonPayloadStore,
    session_id: &str,
    payload_id: &str,
    max_depth: Option<u32>,
    array_sample_size: Option<u32>,
    object_key_limit: Option<u32>,
) -> Result<JsonPayloadDescription, String> {
    let payload = get_payload(store, session_id, payload_id).await?;
    let schema_depth = bounded_option(
        max_depth.map(|value| value as usize),
        DEFAULT_SCHEMA_DEPTH,
        0,
        MAX_SCHEMA_DEPTH,
    );
    let array_sample_size = bounded_option(
        array_sample_size.map(|value| value as usize),
        DEFAULT_ARRAY_SAMPLE_SIZE,
        0,
        MAX_ARRAY_SAMPLE_SIZE,
    );
    let object_key_limit = bounded_option(
        object_key_limit.map(|value| value as usize),
        DEFAULT_OBJECT_KEY_LIMIT,
        1,
        MAX_OBJECT_KEY_LIMIT,
    );

    Ok(JsonPayloadDescription {
        schema: describe_value_shape(
            &payload.value,
            schema_depth,
            array_sample_size,
            object_key_limit,
        ),
        payload: payload.metadata,
        schema_depth,
        array_sample_size,
        object_key_limit,
    })
}

pub(in crate::shards::mcp) async fn query_pointers(
    store: &McpJsonPayloadStore,
    session_id: &str,
    payload_id: &str,
    pointers: &[String],
    max_bytes: Option<u32>,
) -> Result<JsonPointerQueryResponse, String> {
    let payload = get_payload(store, session_id, payload_id).await?;
    let budget_bytes = bounded_option(
        max_bytes.map(|value| value as usize),
        DEFAULT_QUERY_BUDGET_BYTES,
        MIN_QUERY_BUDGET_BYTES,
        MAX_QUERY_BUDGET_BYTES,
    );
    let mut used_bytes = 0usize;
    let mut results = Vec::with_capacity(pointers.len());

    for pointer in pointers {
        if !pointer.is_empty() && !pointer.starts_with('/') {
            results.push(JsonPointerQueryResult {
                pointer: pointer.clone(),
                status: "invalidPointer".to_string(),
                value_type: None,
                estimated_bytes: None,
                value: None,
            });
            continue;
        }

        let Some(value) = payload.value.pointer(pointer) else {
            results.push(JsonPointerQueryResult {
                pointer: pointer.clone(),
                status: "missing".to_string(),
                value_type: None,
                estimated_bytes: None,
                value: None,
            });
            continue;
        };

        let estimated_bytes = estimate_value_bytes(value)?;
        if used_bytes.saturating_add(estimated_bytes) > budget_bytes {
            results.push(JsonPointerQueryResult {
                pointer: pointer.clone(),
                status: "omittedBudgetExceeded".to_string(),
                value_type: Some(value_type(value).to_string()),
                estimated_bytes: Some(estimated_bytes),
                value: None,
            });
            continue;
        }

        used_bytes = used_bytes.saturating_add(estimated_bytes);
        results.push(JsonPointerQueryResult {
            pointer: pointer.clone(),
            status: "ok".to_string(),
            value_type: Some(value_type(value).to_string()),
            estimated_bytes: Some(estimated_bytes),
            value: Some(value.clone()),
        });
    }

    Ok(JsonPointerQueryResponse {
        payload: payload.metadata,
        budget_bytes,
        used_bytes,
        results,
    })
}

pub(in crate::shards::mcp) async fn drop_payload(
    store: &McpJsonPayloadStore,
    session_id: &str,
    payload_id: &str,
) -> bool {
    let mut guard = store.lock().await;
    prune_expired(&mut guard);
    let dropped = guard
        .payloads_by_session
        .get_mut(session_id)
        .is_some_and(|payloads| payloads.remove(payload_id).is_some());
    guard
        .payloads_by_session
        .retain(|_, payloads| !payloads.is_empty());
    dropped
}

async fn get_payload(
    store: &McpJsonPayloadStore,
    session_id: &str,
    payload_id: &str,
) -> Result<StoredJsonPayload, String> {
    let mut guard = store.lock().await;
    prune_expired(&mut guard);
    guard
        .payloads_by_session
        .get(session_id)
        .and_then(|payloads| payloads.get(payload_id))
        .cloned()
        .ok_or_else(|| format!("JSON payload not found or expired: {payload_id}"))
}

fn prune_expired(store: &mut JsonPayloadStore) {
    let now = Instant::now();
    store.payloads_by_session.values_mut().for_each(|payloads| {
        payloads.retain(|_, payload| payload.expires_at_instant > now);
    });
    store
        .payloads_by_session
        .retain(|_, payloads| !payloads.is_empty());
}

pub(in crate::shards::mcp) fn estimate_value_bytes(value: &Value) -> Result<usize, String> {
    serde_json::to_vec(value)
        .map(|bytes| bytes.len())
        .map_err(|error| error.to_string())
}

fn bounded_option(value: Option<usize>, default: usize, min: usize, max: usize) -> usize {
    value.unwrap_or(default).clamp(min, max)
}

fn value_type(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

fn describe_value_shape(
    value: &Value,
    max_depth: usize,
    array_sample_size: usize,
    object_key_limit: usize,
) -> Value {
    describe_value_shape_at(value, 0, max_depth, array_sample_size, object_key_limit)
}

fn describe_value_shape_at(
    value: &Value,
    depth: usize,
    max_depth: usize,
    array_sample_size: usize,
    object_key_limit: usize,
) -> Value {
    match value {
        Value::Object(object) => {
            if depth >= max_depth {
                return json!({
                    "type": "object",
                    "propertyCount": object.len()
                });
            }

            let properties = object
                .iter()
                .take(object_key_limit)
                .map(|(key, value)| {
                    (
                        key.clone(),
                        describe_value_shape_at(
                            value,
                            depth + 1,
                            max_depth,
                            array_sample_size,
                            object_key_limit,
                        ),
                    )
                })
                .collect::<serde_json::Map<String, Value>>();

            json!({
                "type": "object",
                "propertyCount": object.len(),
                "omittedPropertyCount": object.len().saturating_sub(properties.len()),
                "properties": properties
            })
        }
        Value::Array(array) => {
            if depth >= max_depth {
                return json!({
                    "type": "array",
                    "length": array.len()
                });
            }

            let sample_items = array
                .iter()
                .take(array_sample_size)
                .map(|item| {
                    describe_value_shape_at(
                        item,
                        depth + 1,
                        max_depth,
                        array_sample_size,
                        object_key_limit,
                    )
                })
                .collect::<Vec<_>>();

            json!({
                "type": "array",
                "length": array.len(),
                "sampleItems": sample_items
            })
        }
        _ => json!({
            "type": value_type(value)
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn payloads_are_scoped_to_their_owner_session() -> Result<(), String> {
        let store = new_store();
        let opened = put_payload(
            &store,
            "session-a",
            json!({
                "visible": true
            }),
            Some("test-payload".to_string()),
        )
        .await?;
        let payload_id = opened.payload.payload_id;

        assert_eq!(list_payloads(&store, "session-a").await.len(), 1);
        assert!(list_payloads(&store, "session-b").await.is_empty());
        assert!(
            describe_payload(&store, "session-b", &payload_id, None, None, None)
                .await
                .is_err()
        );

        let pointer = "/visible".to_string();
        let response = query_pointers(&store, "session-a", &payload_id, &[pointer], None).await?;
        let result = response
            .results
            .first()
            .ok_or_else(|| "Expected one JSON pointer result".to_string())?;
        assert_eq!(result.status, "ok");
        assert_eq!(result.value, Some(json!(true)));

        assert!(!drop_payload(&store, "session-b", &payload_id).await);
        assert!(drop_payload(&store, "session-a", &payload_id).await);
        assert!(list_payloads(&store, "session-a").await.is_empty());

        Ok(())
    }
}
