use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::RwLock;

use super::session::SgpSession;
use crate::error::AppError;
use crate::shards::lcu::session::LcuSession;
use crate::shards::network::NetworkConfig;

pub struct SgpManager {
    sessions: RwLock<HashMap<u32, Arc<SgpSession>>>,
}

impl SgpManager {
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
        }
    }

    pub async fn get_or_create(
        &self,
        lcu_session: &Arc<LcuSession>,
        network_config: Arc<NetworkConfig>,
    ) -> Result<Arc<SgpSession>, AppError> {
        let pid = lcu_session.auth().pid;

        {
            let sessions = self.sessions.read().await;
            if let Some(session) = sessions.get(&pid) {
                return Ok(session.clone());
            }
        }

        let sgp_session = Arc::new(SgpSession::new(lcu_session, network_config).await?);

        {
            let mut sessions = self.sessions.write().await;
            sessions.insert(pid, sgp_session.clone());
        }

        Ok(sgp_session)
    }

    #[allow(dead_code)]
    pub async fn remove(&self, pid: u32) {
        let mut sessions = self.sessions.write().await;
        sessions.remove(&pid);
    }

    #[allow(dead_code)]
    pub async fn clear(&self) {
        let mut sessions = self.sessions.write().await;
        sessions.clear();
    }
}
