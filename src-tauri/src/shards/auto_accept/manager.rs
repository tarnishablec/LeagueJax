use std::sync::Arc;

use crate::error::AppError;
use crate::shards::lcu::LcuShard;

#[derive(Clone)]
pub struct AutoAcceptManager {
    lcu_shard: Arc<LcuShard>,
}

impl AutoAcceptManager {
    pub fn new(lcu_shard: Arc<LcuShard>) -> Self {
        Self { lcu_shard }
    }

    pub async fn accept_ready_check_for_focused(&self) -> Result<(), AppError> {
        let manager = self.lcu_shard.manager().ok_or(AppError::LcuNotConnected)?;
        let session = manager
            .focused()
            .await
            .filter(|session| session.is_ready())
            .ok_or(AppError::LcuNotConnected)?;

        session.api().accept_ready_check().await
    }
}
