use std::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;

use crate::error::AppError;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::{SettingHandle, SettingsShard};

const COUNTER_COLUMN_LIMIT_SETTING_ID: &str = "opgg.matchups.counterColumnLimit";
pub(super) const DEFAULT_COUNTER_COLUMN_LIMIT: usize = 8;
const MIN_COUNTER_COLUMN_LIMIT: usize = 1;
const MAX_COUNTER_COLUMN_LIMIT: usize = 50;

#[derive(Default)]
pub struct OpggShard {
    counter_column_limit: OnceLock<SettingHandle>,
}

impl OpggShard {
    pub fn new() -> Self {
        Self::default()
    }

    // A request may snapshot the frontend setting before its persistence patch arrives.
    // Other callers read the current persisted value through the same feature-owned policy.
    pub fn counter_column_limit(&self, requested: Option<usize>) -> Result<usize, AppError> {
        if let Some(limit) = requested {
            return validate_counter_column_limit(limit);
        }

        let handle = self
            .counter_column_limit
            .get()
            .ok_or_else(|| AppError::other("OP.GG settings are not initialized"))?;
        let value = handle.get_value()?;
        Ok(counter_column_limit_from_value(&value).unwrap_or(DEFAULT_COUNTER_COLUMN_LIMIT))
    }
}

#[async_trait]
impl Shard for OpggShard {
    shard_id!("7c1e9a44-5b20-4f1a-9c33-8e6d2a1b0c47");
    depends![SettingsShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let handle = settings.register_definition(counter_column_limit_definition())?;
        if self.counter_column_limit.set(handle).is_err() {
            return Err(AppError::other("OP.GG settings are already initialized").into());
        }
        Ok(())
    }
}

fn counter_column_limit_definition() -> SettingDefinitionDto {
    SettingDefinitionDto {
        id: COUNTER_COLUMN_LIMIT_SETTING_ID.to_string(),
        label_key: "settings.opgg.counterColumnLimit.label".to_string(),
        hint_key: Some("settings.opgg.counterColumnLimit.hint".to_string()),
        scope: SettingScopeDto::Shared,
        control: Some(SettingControlDto::Number {
            placeholder_key: None,
            min: Some(MIN_COUNTER_COLUMN_LIMIT as f64),
            max: Some(MAX_COUNTER_COLUMN_LIMIT as f64),
            step: Some(1.0),
        }),
        default_value: Value::from(DEFAULT_COUNTER_COLUMN_LIMIT),
        order: Some(10),
        visible: Some(true),
        options: None,
    }
}

pub(super) fn validate_counter_column_limit(limit: usize) -> Result<usize, AppError> {
    if (MIN_COUNTER_COLUMN_LIMIT..=MAX_COUNTER_COLUMN_LIMIT).contains(&limit) {
        Ok(limit)
    } else {
        Err(AppError::other(
            "OP.GG counter column limit must be an integer between 1 and 50",
        ))
    }
}

// Frontend JSON numbers can arrive as either integer or floating-point values.
fn counter_column_limit_from_value(value: &Value) -> Result<usize, AppError> {
    let limit = value
        .as_f64()
        .filter(|value| value.is_finite() && value.fract() == 0.0)
        .filter(|value| {
            *value >= MIN_COUNTER_COLUMN_LIMIT as f64 && *value <= MAX_COUNTER_COLUMN_LIMIT as f64
        })
        .ok_or_else(|| {
            AppError::other("OP.GG counter column limit must be an integer between 1 and 50")
        })?;
    validate_counter_column_limit(limit as usize)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counter_limit_accepts_integer_json_representations_and_bounds() -> Result<(), AppError> {
        for value in [
            serde_json::json!(1),
            serde_json::json!(8.0),
            serde_json::json!(50),
        ] {
            assert_eq!(
                counter_column_limit_from_value(&value)? as f64,
                value.as_f64().unwrap_or_default()
            );
        }
        Ok(())
    }

    #[test]
    fn counter_limit_rejects_invalid_setting_values() {
        for value in [
            serde_json::json!(0),
            serde_json::json!(51),
            serde_json::json!(-1),
            serde_json::json!(1.5),
            serde_json::json!("8"),
            Value::Null,
            serde_json::json!(u64::MAX),
        ] {
            assert!(counter_column_limit_from_value(&value).is_err());
        }
        assert!(validate_counter_column_limit(0).is_err());
        assert!(validate_counter_column_limit(51).is_err());
    }
}
