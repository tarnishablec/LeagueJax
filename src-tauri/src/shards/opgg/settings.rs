use std::error::Error;
use std::sync::{Arc, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use strum::IntoEnumIterator;

use crate::error::AppError;
use crate::shards::settings::types::{
    SettingControlDto, SettingDefinitionDto, SettingOptionDto, SettingScopeDto,
};
use crate::shards::settings::{SettingHandle, SettingsShard};

use super::{OpggRankTier, OpggRegion};

const RANK_TIER_SETTING_ID: &str = "opgg.filters.rankTier";
const REGION_SETTING_ID: &str = "opgg.filters.region";
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
        settings.register_definition(rank_tier_definition())?;
        settings.register_definition(region_definition())?;
        let handle = settings.register_definition(counter_column_limit_definition())?;
        if self.counter_column_limit.set(handle).is_err() {
            return Err(AppError::other("OP.GG settings are already initialized").into());
        }
        Ok(())
    }
}

// Build the setting options from the API enum so unsupported ranks cannot be saved.
fn rank_tier_definition() -> SettingDefinitionDto {
    SettingDefinitionDto {
        id: RANK_TIER_SETTING_ID.to_string(),
        label_key: "settings.opgg.rankTier.label".to_string(),
        scope: SettingScopeDto::Shared,
        control: Some(SettingControlDto::Select),
        default_value: Value::String(OpggRankTier::default().as_ref().to_string()),
        order: Some(10),
        visible: Some(true),
        options: Some(
            OpggRankTier::iter()
                .map(|tier| SettingOptionDto {
                    value: tier.as_ref().to_string(),
                    label_key: format!("champions.rankTiers.{}", tier.as_ref()),
                    display_label: None,
                })
                .collect(),
        ),
        ..SettingDefinitionDto::default()
    }
}

// Regions share the same catalog as API requests instead of a second settings-only list.
fn region_definition() -> SettingDefinitionDto {
    SettingDefinitionDto {
        id: REGION_SETTING_ID.to_string(),
        label_key: "settings.opgg.region.label".to_string(),
        scope: SettingScopeDto::Shared,
        control: Some(SettingControlDto::Select),
        default_value: Value::String(OpggRegion::default().as_ref().to_string()),
        order: Some(20),
        visible: Some(true),
        options: Some(
            OpggRegion::iter()
                .map(|region| SettingOptionDto {
                    value: region.as_ref().to_string(),
                    label_key: format!("champions.regions.{}", region.as_ref()),
                    display_label: None,
                })
                .collect(),
        ),
        ..SettingDefinitionDto::default()
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
    fn filter_setting_options_match_the_api_enums() -> Result<(), serde_json::Error> {
        for definition in [rank_tier_definition(), region_definition()] {
            assert!(matches!(
                definition.control,
                Some(SettingControlDto::Select)
            ));
            let options = definition.options.unwrap_or_default();
            assert_eq!(options.len(), 16);
            assert!(options
                .iter()
                .any(|option| Value::String(option.value.clone()) == definition.default_value));
            for option in options {
                let value = Value::String(option.value);
                if definition.id == RANK_TIER_SETTING_ID {
                    let tier: OpggRankTier = serde_json::from_value(value.clone())?;
                    assert_eq!(serde_json::to_value(tier)?, value);
                } else {
                    let region: OpggRegion = serde_json::from_value(value.clone())?;
                    assert_eq!(serde_json::to_value(region)?, value);
                }
            }
        }
        Ok(())
    }

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
