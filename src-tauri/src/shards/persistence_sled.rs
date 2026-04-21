use crate::error::AppError;
use core::error::Error;
use jax::{depends, shard_id, Jax, Shard};
use sled::Db;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::OnceLock;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

pub struct PersistenceSled {
    path: PathBuf,
    db: OnceLock<Db>,
}

impl PersistenceSled {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            path: db_path,
            db: OnceLock::new(),
        }
    }

    pub fn get_db(&self) -> Result<Db, AppError> {
        Ok(self
            .db
            .get()
            .ok_or_else(|| AppError::other("Sled database is not initialized".to_string()))?
            .clone())
    }

    fn backup_corrupted_db_dir(path: &Path) -> Result<PathBuf, io::Error> {
        if !path.exists() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!(
                    "sled corruption recovery failed: database path {} does not exist",
                    path.display()
                ),
            ));
        }

        let parent = path.parent().ok_or_else(|| {
            io::Error::other(format!(
                "sled corruption recovery failed: path {} has no parent directory",
                path.display()
            ))
        })?;

        let base_name = path.file_name().ok_or_else(|| {
            io::Error::other(format!(
                "sled corruption recovery failed: path {} has no file name",
                path.display()
            ))
        })?;

        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        for attempt in 0..1000 {
            let suffix = if attempt == 0 {
                format!("_corrupt_{ts}")
            } else {
                format!("_corrupt_{ts}_{attempt}")
            };
            let mut backup_name = base_name.to_os_string();
            backup_name.push(suffix);
            let backup_path = parent.join(backup_name);

            if backup_path.exists() {
                continue;
            }

            std::fs::rename(path, &backup_path)?;
            return Ok(backup_path);
        }

        Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            format!(
                "sled corruption recovery failed: could not allocate backup name for {}",
                path.display()
            ),
        ))
    }

    fn open_with_auto_recovery(path: PathBuf) -> Result<Db, Box<dyn Error + Send + Sync>> {
        match sled::open(&path) {
            Ok(db) => Ok(db),
            Err(sled::Error::Corruption { .. }) => {
                let backup_path = Self::backup_corrupted_db_dir(&path)?;
                tracing::error!(
                    db_path = %path.display(),
                    backup_path = %backup_path.display(),
                    "Detected corrupted sled database and moved it to backup path"
                );

                std::fs::create_dir_all(&path)?;
                let reopened = sled::open(&path).map_err(|error| {
                    io::Error::other(format!(
                        "failed to reopen sled database after corruption recovery: {error}"
                    ))
                })?;

                tracing::warn!(
                    db_path = %path.display(),
                    "Recreated sled database after corruption recovery"
                );
                Ok(reopened)
            }
            Err(error) => Err(Box::new(error)),
        }
    }
}

#[async_trait::async_trait]
impl Shard for PersistenceSled {
    shard_id!("11c8b250-cd30-4f0a-a500-aa4b355311f0");

    async fn setup(&self, _jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let path = self.path.clone();
        let db = tokio::task::spawn_blocking(move || Self::open_with_auto_recovery(path)).await??;

        self.db
            .set(db)
            .map_err(|_| "Database already initialized")?;
        Ok(())
    }

    fn dependencies(&self) -> Vec<Uuid> {
        depends![]
    }
}
