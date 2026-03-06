use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::RwLock;

use crate::error::Result;
use crate::lcu::{LcuAuth, LcuClient};
use crate::storage::{SqliteDb, StoreManager};

pub struct AppState {
    pub app: AppHandle,
    pub lcu_client: RwLock<Option<Arc<LcuClient>>>,
    pub lcu_auth: RwLock<Option<LcuAuth>>,
    pub db: Arc<SqliteDb>,
    pub store: Arc<StoreManager>,
}

impl AppState {
    pub fn new(app: &AppHandle, db: SqliteDb) -> Self {
        Self {
            app: app.clone(),
            lcu_client: RwLock::new(None),
            lcu_auth: RwLock::new(None),
            db: Arc::new(db),
            store: Arc::new(StoreManager::new(app.clone())),
        }
    }

    /// Called when LCU connects successfully
    pub async fn set_lcu_connected(&self, auth: LcuAuth) -> Result<()> {
        let client = LcuClient::new(auth.clone())?;
        *self.lcu_client.write().await = Some(Arc::new(client));
        *self.lcu_auth.write().await = Some(auth);
        Ok(())
    }

    /// Called when LCU disconnects
    pub async fn set_lcu_disconnected(&self) {
        *self.lcu_client.write().await = None;
        *self.lcu_auth.write().await = None;
    }

    /// Get LCU client (None if not connected)
    pub async fn lcu(&self) -> Option<Arc<LcuClient>> {
        self.lcu_client.read().await.clone()
    }
}
