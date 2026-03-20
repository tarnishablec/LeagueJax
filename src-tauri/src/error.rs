use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("LCU not connected")]
    LcuNotConnected,

    #[error("LCU request failed: {0}")]
    LcuRequest(#[from] reqwest::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Sled error: {0}")]
    Sled(#[from] sled::Error),

    #[allow(dead_code)]
    #[error("Mutex poisoned")]
    MutexPoisoned,

    #[error("{0}")]
    Other(String),
}

impl AppError {
    fn to_client_message(&self) -> &'static str {
        "Internal error. Check backend logs."
    }

    fn log_internal(&self) {
        tracing::error!(error = %self, "Backend command failed");
    }
}

// Tauri commands must return errors that implement Serialize
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.log_internal();
        serializer.serialize_str(self.to_client_message())
    }
}
