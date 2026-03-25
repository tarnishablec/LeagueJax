use std::collections::HashMap;
use std::error::Error;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde::Serialize;
use uuid::Uuid;

use crate::shards::tauri_host::TauriHost;

// ---------------------------------------------------------------------------
// FileLogger — write pretty JSON to key-based log files
// ---------------------------------------------------------------------------

pub struct FileLogger {
    log_dir: PathBuf,
    writers: Mutex<HashMap<String, File>>,
}

impl FileLogger {
    fn new(log_dir: PathBuf) -> Self {
        Self {
            log_dir,
            writers: Mutex::new(HashMap::new()),
        }
    }

    /// Write a serializable value as pretty JSON to `logs/{key}.log`.
    /// Each entry is prefixed with a timestamp.
    pub fn write<T: Serialize>(&self, key: &str, value: &T) {
        let json = match serde_json::to_string_pretty(value) {
            Ok(j) => j,
            Err(e) => {
                tracing::warn!("FileLogger: failed to serialize for key={key}: {e}");
                return;
            }
        };

        let timestamp = time::OffsetDateTime::now_utc()
            .format(&time::format_description::well_known::Rfc2822)
            .unwrap_or_default();
        let entry = format!("[{timestamp}] {key}\n{json}\n\n");

        let mut writers = match self.writers.lock() {
            Ok(w) => w,
            Err(_) => return,
        };

        let file = writers.entry(key.to_string()).or_insert_with(|| {
            if let Err(e) = fs::create_dir_all(&self.log_dir) {
                tracing::warn!("FileLogger: failed to create log dir: {e}");
            }
            let path = self.log_dir.join(format!("{key}.log"));
            OpenOptions::new()
                .create(true)
                .append(true)
                .open(&path)
                .unwrap_or_else(|e| {
                    tracing::error!("FileLogger: failed to open {}: {e}", path.display());
                    // Fallback to /dev/null equivalent — writes will silently fail
                    File::open(if cfg!(windows) { "NUL" } else { "/dev/null" })
                        .expect("cannot open null device")
                })
        });

        if let Err(e) = file.write_all(entry.as_bytes()) {
            tracing::warn!("FileLogger: write error for key={key}: {e}");
        }
    }
}

// ---------------------------------------------------------------------------
// Shard
// ---------------------------------------------------------------------------

pub struct FileLoggerShard {
    logger: std::sync::OnceLock<Arc<FileLogger>>,
}

impl FileLoggerShard {
    pub fn new() -> Self {
        Self {
            logger: std::sync::OnceLock::new(),
        }
    }

    pub fn logger(&self) -> Option<&Arc<FileLogger>> {
        self.logger.get()
    }
}

#[async_trait]
impl Shard for FileLoggerShard {
    shard_id!(r"a1b2c3d4-e5f6-7890-abcd-ef1234567890");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        use tauri::Manager;
        let app = &jax.get_shard::<TauriHost>().app;
        let log_dir = app
            .path()
            .app_data_dir()
            .map(|d: PathBuf| d.join("logs"))
            .map_err(|e| -> Box<dyn Error + Send + Sync> { Box::from(e.to_string()) })?;

        let logger = Arc::new(FileLogger::new(log_dir));
        self.logger.set(logger).ok();

        tracing::info!("FileLoggerShard initialized");
        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![TauriHost]
    }
}
