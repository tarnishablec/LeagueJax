use std::sync::Arc;

use async_trait::async_trait;
use uuid::Uuid;

use crate::error::Result;
use crate::jax::Jax;

pub mod auto_gameflow;
pub mod auto_reply;
pub mod auto_select;
pub mod keyboard;
pub mod lcu;
pub mod ongoing_game;
pub mod saved_player;
pub mod statistics;
pub mod tray;
pub mod updater;

/// All feature shards must implement this trait.
///
/// Shards receive `Arc<Jax>` in `setup()` and can access other shards
/// via `jax.get_shard::<ConcreteType>()`.
#[async_trait]
pub trait Shard: Send + Sync {
    /// Stable UUID — must match the corresponding Web-side SHARD_IDS constant
    fn id(&self) -> Uuid;

    /// Human-readable display name (used for logging and get_shards response)
    fn label(&self) -> &'static str;

    /// Called at app startup: subscribe to events, load config, etc.
    async fn setup(&self, jax: Arc<Jax>) -> Result<()>;
}
