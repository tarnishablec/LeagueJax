pub mod types;

use self::types::{
    SettingControlDto, SettingDefinitionDto, SettingsBootstrapDto, SettingsChangedEventDto,
    SettingsDefinitionsChangedEventDto, SettingsSnapshotDto,
};
use crate::error::AppError;
use crate::shards::persistence_sled::PersistenceSled;
use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use sled::Db;
use std::collections::BTreeMap;
use std::error::Error;
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, OnceLock, RwLock};
use tokio::sync::{broadcast, watch};
use tokio::task::JoinHandle;

const SETTINGS_TREE: &str = "settings";
const SETTINGS_SNAPSHOT_KEY: &[u8] = b"snapshot";
const SETTINGS_CHANGE_CHANNEL_CAPACITY: usize = 64;

#[derive(Debug, Clone)]
pub struct ApplySettingsOutcome {
    pub snapshot: SettingsSnapshotDto,
}

#[derive(Clone)]
pub struct SettingHandle {
    shard: Arc<SettingsShard>,
    id: String,
}

impl SettingHandle {
    #[allow(unused)]
    pub fn id(&self) -> &str {
        &self.id
    }

    pub fn get_value(&self) -> Result<Value, AppError> {
        self.shard
            .get_value(&self.id)?
            .ok_or_else(|| AppError::other(format!("Setting {} has no value", self.id)))
    }

    pub fn set_value(&self, value: Value) -> Result<ApplySettingsOutcome, AppError> {
        self.shard.set_value(&self.id, value)
    }

    pub fn watch(&self) -> Result<watch::Receiver<Value>, AppError> {
        self.shard.watch_value(&self.id)
    }

    pub fn spawn_watch<F, Fut>(
        &self,
        emit_initial: bool,
        on_change: F,
    ) -> Result<JoinHandle<()>, AppError>
    where
        F: Fn(Value) -> Fut + Send + 'static,
        Fut: Future<Output = ()> + Send + 'static,
    {
        let initial = if emit_initial {
            Some(self.get_value()?)
        } else {
            None
        };

        let mut rx = self.watch()?;
        Ok(tokio::spawn(async move {
            if let Some(initial) = initial {
                on_change(initial).await;
            }

            loop {
                if rx.changed().await.is_err() {
                    break;
                }
                let next = rx.borrow().clone();
                on_change(next).await;
            }
        }))
    }
}

type ActionFuture = Pin<Box<dyn Future<Output = Result<Value, AppError>> + Send>>;
type ActionHandler = Box<dyn Fn() -> ActionFuture + Send + Sync>;

pub struct SettingsShard {
    db: OnceLock<Db>,
    definitions: RwLock<BTreeMap<String, SettingDefinitionDto>>,
    snapshot: RwLock<SettingsSnapshotDto>,
    watch_senders: RwLock<BTreeMap<String, watch::Sender<Value>>>,
    action_handlers: RwLock<BTreeMap<String, ActionHandler>>,
    change_events: broadcast::Sender<SettingsChangedEventDto>,
    definition_events: broadcast::Sender<SettingsDefinitionsChangedEventDto>,
}

impl SettingsShard {
    pub fn new() -> Self {
        let (change_events, _change_events_rx) =
            broadcast::channel(SETTINGS_CHANGE_CHANNEL_CAPACITY);
        let (definition_events, _definition_events_rx) =
            broadcast::channel(SETTINGS_CHANGE_CHANNEL_CAPACITY);

        Self {
            db: OnceLock::new(),
            definitions: RwLock::new(BTreeMap::new()),
            snapshot: RwLock::new(SettingsSnapshotDto {
                values: BTreeMap::new(),
            }),
            watch_senders: RwLock::new(BTreeMap::new()),
            action_handlers: RwLock::new(BTreeMap::new()),
            change_events,
            definition_events,
        }
    }

    pub fn register_definition(
        self: &Arc<Self>,
        definition: SettingDefinitionDto,
    ) -> Result<SettingHandle, AppError> {
        validate_setting_id(&definition.id)?;
        validate_definition(&definition)?;

        {
            let mut definitions = self
                .definitions
                .write()
                .map_err(|_| AppError::MutexPoisoned)?;

            if let Some(existing) = definitions.get(&definition.id) {
                if existing == &definition {
                    return self.setting_handle(&definition.id);
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

        let initial_value = self
            .get_value(&definition.id)?
            .unwrap_or_else(|| definition.default_value.clone());
        self.ensure_watch_sender(&definition.id, initial_value)?;

        let handle = self.setting_handle(&definition.id)?;
        self.emit_definitions_changed(vec![definition.id]);
        Ok(handle)
    }

    pub fn register_action<F, Fut>(
        self: &Arc<Self>,
        definition: SettingDefinitionDto,
        handler: F,
    ) -> Result<(), AppError>
    where
        F: Fn() -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<Value, AppError>> + Send + 'static,
    {
        if !matches!(definition.control, SettingControlDto::Action) {
            return Err(AppError::other(format!(
                "register_action requires Action control, got {:?} for {}",
                definition.control, definition.id
            )));
        }

        validate_setting_id(&definition.id)?;

        let definitions_changed = {
            let mut definitions = self
                .definitions
                .write()
                .map_err(|_| AppError::MutexPoisoned)?;
            let existing = definitions.insert(definition.id.clone(), definition.clone());
            existing.as_ref() != Some(&definition)
        };

        {
            let mut handlers = self
                .action_handlers
                .write()
                .map_err(|_| AppError::MutexPoisoned)?;
            handlers.insert(definition.id.clone(), Box::new(move || Box::pin(handler())));
        }

        if definitions_changed {
            self.emit_definitions_changed(vec![definition.id]);
        }

        Ok(())
    }

    pub async fn invoke_action(&self, id: &str) -> Result<Value, AppError> {
        let action = {
            let handlers = self
                .action_handlers
                .read()
                .map_err(|_| AppError::MutexPoisoned)?;

            let handler = handlers
                .get(id)
                .ok_or_else(|| AppError::other(format!("No action handler registered for {id}")))?;

            handler()
        };

        action.await
    }

    pub fn setting_handle(self: &Arc<Self>, id: &str) -> Result<SettingHandle, AppError> {
        validate_setting_id(id)?;

        let has_definition = self
            .definitions
            .read()
            .map_err(|_| AppError::MutexPoisoned)?
            .contains_key(id);
        let has_snapshot_value = self.get_value(id)?.is_some();

        if !has_definition && !has_snapshot_value {
            return Err(AppError::other(format!("Setting {id} is not registered")));
        }

        Ok(SettingHandle {
            shard: Arc::clone(self),
            id: id.to_string(),
        })
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

    pub fn subscribe_changes(&self) -> broadcast::Receiver<SettingsChangedEventDto> {
        self.change_events.subscribe()
    }

    pub fn subscribe_definitions_changes(
        &self,
    ) -> broadcast::Receiver<SettingsDefinitionsChangedEventDto> {
        self.definition_events.subscribe()
    }

    pub fn get_value(&self, id: &str) -> Result<Option<Value>, AppError> {
        let snapshot = self.snapshot.read().map_err(|_| AppError::MutexPoisoned)?;
        Ok(snapshot.values.get(id).cloned())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<Value>, AppError> {
        self.get_value(key)
    }

    pub fn set_value(&self, id: &str, value: Value) -> Result<ApplySettingsOutcome, AppError> {
        self.set_value_with_source(id, value, None)
    }

    pub fn set_value_with_source(
        &self,
        id: &str,
        value: Value,
        source: Option<String>,
    ) -> Result<ApplySettingsOutcome, AppError> {
        validate_setting_id(id)?;
        let mut changes = BTreeMap::new();
        changes.insert(id.to_string(), value);
        self.set_values_with_source(changes, source)
    }

    pub fn set_values_with_source(
        &self,
        changes: BTreeMap<String, Value>,
        source: Option<String>,
    ) -> Result<ApplySettingsOutcome, AppError> {
        if changes.is_empty() {
            let snapshot = self
                .snapshot
                .read()
                .map_err(|_| AppError::MutexPoisoned)?
                .clone();
            return Ok(ApplySettingsOutcome { snapshot });
        }

        let definitions = self
            .definitions
            .read()
            .map_err(|_| AppError::MutexPoisoned)?
            .clone();

        let mut changed = BTreeMap::new();
        let snapshot_to_persist = {
            let mut snapshot = self.snapshot.write().map_err(|_| AppError::MutexPoisoned)?;

            for (id, value) in &changes {
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
                return Ok(ApplySettingsOutcome {
                    snapshot: snapshot.clone(),
                });
            }
            snapshot.clone()
        };

        self.write_snapshot_to_db(&snapshot_to_persist)?;
        self.sync_watch_senders(&changed)?;
        self.emit_changed(changed.clone(), source);

        Ok(ApplySettingsOutcome {
            snapshot: snapshot_to_persist,
        })
    }

    pub fn watch_value(&self, id: &str) -> Result<watch::Receiver<Value>, AppError> {
        validate_setting_id(id)?;

        {
            let senders = self
                .watch_senders
                .read()
                .map_err(|_| AppError::MutexPoisoned)?;
            if let Some(sender) = senders.get(id) {
                return Ok(sender.subscribe());
            }
        }

        let initial_value = self.get_value(id)?.ok_or_else(|| {
            AppError::other(format!(
                "Setting {id} is not registered and has no persisted value"
            ))
        })?;

        let sender = self.ensure_watch_sender(id, initial_value)?;
        Ok(sender.subscribe())
    }

    fn sync_watch_senders(&self, changes: &BTreeMap<String, Value>) -> Result<(), AppError> {
        if changes.is_empty() {
            return Ok(());
        }

        let mut senders = self
            .watch_senders
            .write()
            .map_err(|_| AppError::MutexPoisoned)?;

        for (id, value) in changes {
            if let Some(sender) = senders.get(id) {
                sender.send_replace(value.clone());
            } else {
                let (sender, _receiver) = watch::channel(value.clone());
                senders.insert(id.clone(), sender);
            }
        }

        Ok(())
    }

    fn ensure_watch_sender(
        &self,
        id: &str,
        initial_value: Value,
    ) -> Result<watch::Sender<Value>, AppError> {
        let mut senders = self
            .watch_senders
            .write()
            .map_err(|_| AppError::MutexPoisoned)?;

        if let Some(sender) = senders.get(id) {
            return Ok(sender.clone());
        }

        let (sender, _receiver) = watch::channel(initial_value);
        senders.insert(id.to_string(), sender.clone());
        Ok(sender)
    }

    fn emit_changed(&self, changes: BTreeMap<String, Value>, source: Option<String>) {
        if changes.is_empty() {
            return;
        }

        let _ = self
            .change_events
            .send(SettingsChangedEventDto { changes, source });
    }

    fn emit_definitions_changed(&self, ids: Vec<String>) {
        if ids.is_empty() {
            return;
        }

        let _ = self
            .definition_events
            .send(SettingsDefinitionsChangedEventDto { ids });
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
    depends![PersistenceSled];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let db = jax.get_shard::<PersistenceSled>().get_db()?;
        self.db
            .set(db)
            .map_err(|_| "Settings DB already initialized")?;

        let snapshot = self.read_snapshot_from_db()?;

        {
            let mut guard = self.snapshot.write().map_err(|_| AppError::MutexPoisoned)?;
            *guard = snapshot;
        }

        Ok(())
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
    if !matches!(definition.control, SettingControlDto::Action)
        && !is_value_compatible(definition, &definition.default_value)
    {
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
        SettingControlDto::Action => value.is_null(),
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

    Ok(SettingsSnapshotDto { values })
}
