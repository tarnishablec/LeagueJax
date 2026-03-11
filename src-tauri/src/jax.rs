use std::any::{Any, TypeId};
use std::collections::HashMap;
use std::sync::Arc;

use tauri::AppHandle;
use uuid::Uuid;

use crate::shards::Shard;
use crate::storage::{SqliteDb};

/// Core application context.
///
/// Lifecycle: `new()` → `register()` → `Arc::new()` → `start()`.
/// Tauri drives it: `Builder::setup()` builds and starts Jax.
pub struct Jax {
    app: AppHandle,
    pub db: Arc<SqliteDb>,
    shards: Vec<Arc<dyn Shard>>,
    typed: HashMap<TypeId, Box<dyn Any + Send + Sync>>,
}

impl Jax {
    pub fn new(app: &AppHandle, db: SqliteDb) -> Self {
        Self {
            app: app.clone(),
            db: Arc::new(db),
            shards: Vec::new(),
            typed: HashMap::new(),
        }
    }

    /// Register a shard. Must be called before `start()`.
    pub fn register<T: Shard + 'static>(&mut self, shard: Arc<T>) {
        self.typed
            .insert(TypeId::of::<T>(), Box::new(shard.clone()));
        self.shards.push(shard);
    }

    /// Set up all registered shards. Call once after wrapping in `Arc`.
    pub fn start(self: &Arc<Self>) {
        for shard in &self.shards {
            let shard = shard.clone();
            let jax = self.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = shard.setup(jax).await {
                    tracing::error!("[{}] setup failed: {e}", shard.label());
                }
            });
        }
    }

    /// Retrieve a shard by its concrete type.
    ///
    /// ```ignore
    /// let lcu = jax.get_shard::<LcuShard>();
    /// lcu.subscribe();
    /// ```
    ///
    /// Panics if `T` was never registered.
    pub fn get_shard<T: Send + Sync + 'static>(&self) -> Arc<T> {
        self.typed
            .get(&TypeId::of::<T>())
            .and_then(|b| b.downcast_ref::<Arc<T>>())
            .cloned()
            .expect("shard not registered")
    }

    /// Access the Tauri `AppHandle` (for `emit`, window management, etc.)
    pub fn app(&self) -> &AppHandle {
        &self.app
    }

    /// Build shard info list for the frontend `get_shards` command.
    pub fn shard_info(&self) -> Vec<ShardInfo> {
        self.shards
            .iter()
            .map(|s| ShardInfo {
                id: s.id(),
                label: s.label(),
                enabled: true,
            })
            .collect()
    }
}

/// Serializable shard descriptor sent to the frontend via `get_shards`
#[derive(serde::Serialize, Clone)]
pub struct ShardInfo {
    pub id: Uuid,
    pub label: &'static str,
    pub enabled: bool,
}
