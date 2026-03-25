pub mod types;

use self::types::{
    SettingControlDto, SettingDefinitionDto, SettingsBootstrapDto, SettingsPatchDto,
    SettingsSnapshotDto,
};
use crate::error::AppError;
use crate::shards::persistence_sled::PersistenceSled;
use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use sled::Db;
use std::collections::BTreeMap;
use std::error::Error;
use std::sync::{Arc, OnceLock, RwLock};
use uuid::Uuid;

const SETTINGS_TREE: &str = "settings";
const SETTINGS_SNAPSHOT_KEY: &[u8] = b"snapshot";
const SETTINGS_KEY_MIGRATIONS: [(&str, &str); 3] = [
    (
        "general.preferences.language",
        "system.preferences.language",
    ),
    ("general.preferences.theme", "system.preferences.theme"),
    ("core.logging.level", "system.logging.level"),
];

#[derive(Debug, Clone)]
pub struct ApplyPatchOutcome {
    pub snapshot: SettingsSnapshotDto,
    pub changes: BTreeMap<String, Value>,
}

pub struct SettingsShard {
    db: OnceLock<Db>,
    definitions: RwLock<BTreeMap<String, SettingDefinitionDto>>,
    snapshot: RwLock<SettingsSnapshotDto>,
}

impl SettingsShard {
    pub fn new() -> Self {
        Self {
            db: OnceLock::new(),
            definitions: RwLock::new(BTreeMap::new()),
            snapshot: RwLock::new(SettingsSnapshotDto {
                version: 0,
                values: BTreeMap::new(),
            }),
        }
    }

    pub fn register_definition(&self, definition: SettingDefinitionDto) -> Result<(), AppError> {
        validate_setting_id(&definition.id)?;
        validate_definition(&definition)?;

        {
            let mut definitions = self
                .definitions
                .write()
                .map_err(|_| AppError::MutexPoisoned)?;

            if let Some(existing) = definitions.get(&definition.id) {
                if existing == &definition {
                    return Ok(());
                }
                return Err(AppError::other(format!(
                    "Setting definition conflict for id {}",
                    definition.id
                )));
            }

            definitions.insert(definition.id.clone(), definition.clone());
        }

        let mut snapshot_to_persist: Option<SettingsSnapshotDto> = None;
        {
            let mut snapshot = self.snapshot.write().map_err(|_| AppError::MutexPoisoned)?;

            if !snapshot.values.contains_key(&definition.id) {
                snapshot
                    .values
                    .insert(definition.id.clone(), definition.default_value.clone());
                snapshot_to_persist = Some(snapshot.clone());
            }
        }

        if let Some(snapshot) = snapshot_to_persist {
            self.write_snapshot_to_db(&snapshot)?;
        }

        Ok(())
    }

    pub fn get_bootstrap(&self) -> Result<SettingsBootstrapDto, AppError> {
        let definitions = self
            .definitions
            .read()
            .map_err(|_| AppError::MutexPoisoned)?
            .values()
            .cloned()
            .collect::<Vec<_>>();
        let snapshot = self
            .snapshot
            .read()
            .map_err(|_| AppError::MutexPoisoned)?
            .clone();

        Ok(SettingsBootstrapDto {
            definitions,
            snapshot,
        })
    }

    pub fn get_value(&self, id: &str) -> Result<Option<Value>, AppError> {
        let snapshot = self.snapshot.read().map_err(|_| AppError::MutexPoisoned)?;
        Ok(snapshot.values.get(id).cloned())
    }

    pub fn apply_patch(&self, patch: &SettingsPatchDto) -> Result<ApplyPatchOutcome, AppError> {
        let definitions = self
            .definitions
            .read()
            .map_err(|_| AppError::MutexPoisoned)?
            .clone();

        let mut changed = BTreeMap::new();
        let snapshot_to_persist = {
            let mut snapshot = self.snapshot.write().map_err(|_| AppError::MutexPoisoned)?;

            if let Some(expected) = patch.expected_version {
                if expected != snapshot.version {
                    return Err(AppError::other(format!(
                        "Settings version mismatch: expected {}, got {}",
                        expected, snapshot.version
                    )));
                }
            }

            for (id, value) in &patch.changes {
                validate_setting_id(id)?;

                if let Some(definition) = definitions.get(id) {
                    if !is_value_compatible(definition, value) {
                        return Err(AppError::other(format!("Invalid value for setting {}", id)));
                    }
                }

                let is_same = snapshot
                    .values
                    .get(id)
                    .is_some_and(|existing| existing == value);
                if is_same {
                    continue;
                }

                snapshot.values.insert(id.clone(), value.clone());
                changed.insert(id.clone(), value.clone());
            }

            if changed.is_empty() {
                return Ok(ApplyPatchOutcome {
                    snapshot: snapshot.clone(),
                    changes: changed,
                });
            }

            snapshot.version = snapshot.version.saturating_add(1);
            snapshot.clone()
        };

        self.write_snapshot_to_db(&snapshot_to_persist)?;

        Ok(ApplyPatchOutcome {
            snapshot: snapshot_to_persist,
            changes: changed,
        })
    }

    fn read_snapshot_from_db(&self) -> Result<SettingsSnapshotDto, AppError> {
        let db = self.get_db()?;
        let tree = db.open_tree(SETTINGS_TREE)?;
        let Some(bytes) = tree.get(SETTINGS_SNAPSHOT_KEY)? else {
            tracing::info!(
                tree = SETTINGS_TREE,
                key = "snapshot",
                hit = false,
                "Read settings snapshot",
            );
            return Ok(SettingsSnapshotDto {
                version: 0,
                values: BTreeMap::new(),
            });
        };

        tracing::info!(
            tree = SETTINGS_TREE,
            key = "snapshot",
            hit = true,
            bytes = bytes.len(),
            "Read settings snapshot",
        );

        parse_snapshot_bytes(&bytes)
    }

    fn write_snapshot_to_db(&self, snapshot: &SettingsSnapshotDto) -> Result<(), AppError> {
        let db = self.get_db()?;
        let tree = db.open_tree(SETTINGS_TREE)?;
        let bytes = serde_json::to_vec(snapshot)?;
        tree.insert(SETTINGS_SNAPSHOT_KEY, bytes.as_slice())?;
        tree.flush()?;

        tracing::info!(
            tree = SETTINGS_TREE,
            key = "snapshot",
            version = snapshot.version,
            bytes = bytes.len(),
            "Persisted settings snapshot",
        );
        Ok(())
    }

    fn get_db(&self) -> Result<Db, AppError> {
        Ok(self
            .db
            .get()
            .ok_or_else(|| AppError::other("Settings DB is not initialized".to_string()))?
            .clone())
    }
}

impl Default for SettingsShard {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Shard for SettingsShard {
    shard_id!("b59f17b0-24ef-4ce1-a106-f430ec20457e");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let db = jax.get_shard::<PersistenceSled>().get_db()?;
        self.db
            .set(db)
            .map_err(|_| "Settings DB already initialized")?;

        let mut snapshot = self.read_snapshot_from_db()?;
        let migrated_count = migrate_legacy_keys(&mut snapshot);
        if migrated_count > 0 {
            self.write_snapshot_to_db(&snapshot)?;
            tracing::info!(
                migrated_count,
                "Migrated legacy settings keys to system namespace",
            );
        }

        {
            let mut guard = self.snapshot.write().map_err(|_| AppError::MutexPoisoned)?;
            *guard = snapshot;
        }

        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![PersistenceSled]
    }
}

fn validate_setting_id(id: &str) -> Result<(), AppError> {
    let segments = id.split('.').collect::<Vec<_>>();
    if segments.len() != 3 || segments.iter().any(|segment| segment.is_empty()) {
        return Err(AppError::other(format!(
            "Invalid setting id {}, expected page.section.field format",
            id
        )));
    }
    Ok(())
}

fn validate_definition(definition: &SettingDefinitionDto) -> Result<(), AppError> {
    if !is_value_compatible(definition, &definition.default_value) {
        return Err(AppError::other(format!(
            "Default value is incompatible with setting {}",
            definition.id
        )));
    }

    if matches!(definition.control, SettingControlDto::Select)
        && definition
            .options
            .as_ref()
            .is_none_or(|items| items.is_empty())
    {
        return Err(AppError::other(format!(
            "Select setting {} requires non-empty options",
            definition.id
        )));
    }

    Ok(())
}

fn is_value_compatible(definition: &SettingDefinitionDto, value: &Value) -> bool {
    match &definition.control {
        SettingControlDto::Toggle => value.is_boolean(),
        SettingControlDto::Text { .. } => value.is_string(),
        SettingControlDto::Number { .. } => value.is_number(),
        SettingControlDto::Select => value.as_str().is_some_and(|current| {
            definition
                .options
                .as_ref()
                .is_none_or(|options| options.iter().any(|item| item.value == current))
        }),
    }
}

fn parse_snapshot_bytes(bytes: &[u8]) -> Result<SettingsSnapshotDto, AppError> {
    if let Ok(snapshot) = serde_json::from_slice::<SettingsSnapshotDto>(bytes) {
        return Ok(snapshot);
    }

    let legacy_value = serde_json::from_slice::<Value>(bytes)?;
    let legacy_object = legacy_value.as_object().ok_or_else(|| {
        AppError::other("Settings snapshot must be an object or snapshot payload".to_string())
    })?;

    let mut values = BTreeMap::new();
    for (key, value) in legacy_object {
        values.insert(key.clone(), value.clone());
    }

    Ok(SettingsSnapshotDto { version: 0, values })
}

fn migrate_legacy_keys(snapshot: &mut SettingsSnapshotDto) -> usize {
    let mut changed = 0usize;

    for (old_key, new_key) in SETTINGS_KEY_MIGRATIONS {
        let old_value = snapshot.values.remove(old_key);
        if let Some(value) = old_value {
            if !snapshot.values.contains_key(new_key) {
                snapshot.values.insert(new_key.to_string(), value);
            }
            changed = changed.saturating_add(1);
        }
    }

    changed
}
