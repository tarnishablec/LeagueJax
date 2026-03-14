use std::sync::Arc;
use async_trait::async_trait;
use uuid::Uuid;
use crate::jax::Jax;

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
    async fn setup(&self, jax: Arc<Jax>) -> crate::error::Result<()>;

    /// Called at shard shutdown: unsubscribe from events, save config, etc.
    async fn teardown(&self) -> crate::error::Result<()> {
        Ok(())
    }
}
