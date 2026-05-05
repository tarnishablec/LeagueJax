pub mod parser;
pub mod types;

use core::error::Error;
use std::cmp::Reverse;
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, OnceLock, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde::{Deserialize, Serialize};
use sled::Db;

use self::types::{
    ReplayEntry, ReplayExecutable, ReplayFolder, ReplayLaunchAvailability, ReplayLibrarySnapshot,
    ReplayMatchContext, ReplayMatchState,
};
use crate::error::AppError;
use crate::shards::lcu::installs::discover_lol_client_installs;
use crate::shards::lcu::LcuShard;
use crate::shards::persistence_sled::PersistenceSled;

const REPLAY_TREE: &str = "replay";
const REPLAY_FOLDERS_KEY: &[u8] = b"folders";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReplayFolderConfig {
    path: String,
    enabled: bool,
}

pub struct ReplayShard {
    db: OnceLock<Db>,
    executables: RwLock<Vec<ReplayExecutable>>,
}

impl ReplayShard {
    pub fn new() -> Self {
        Self {
            db: OnceLock::new(),
            executables: RwLock::new(Vec::new()),
        }
    }

    pub fn snapshot(&self) -> Result<ReplayLibrarySnapshot, AppError> {
        let folders = self.load_folders()?;
        let executables = self.cached_executables()?;
        let entries = scan_replay_entries(&folders, &executables)?;

        Ok(ReplayLibrarySnapshot {
            folders: folders
                .into_iter()
                .map(|folder| ReplayFolder {
                    exists: Path::new(&folder.path).is_dir(),
                    path: folder.path,
                    enabled: folder.enabled,
                })
                .collect(),
            executables,
            entries,
        })
    }

    pub fn scan(&self) -> Result<ReplayLibrarySnapshot, AppError> {
        self.refresh_executables()?;
        self.snapshot()
    }

    pub fn add_folder(&self, path: String) -> Result<ReplayLibrarySnapshot, AppError> {
        let path = normalize_path_string(&path)?;
        let mut folders = self.load_folders()?;
        if !folders.iter().any(|folder| folder.path == path) {
            folders.push(ReplayFolderConfig {
                path,
                enabled: true,
            });
            self.store_folders(&folders)?;
        }
        self.snapshot()
    }

    pub fn remove_folder(&self, path: String) -> Result<ReplayLibrarySnapshot, AppError> {
        let path = normalize_path_string(&path)?;
        let mut folders = self.load_folders()?;
        folders.retain(|folder| folder.path != path);
        self.store_folders(&folders)?;
        self.snapshot()
    }

    pub fn open_folder(&self, path: String) -> Result<(), AppError> {
        let folder_path = PathBuf::from(normalize_path_string(&path)?);
        if !folder_path.is_dir() {
            return Err(AppError::other("Replay folder does not exist"));
        }

        let folders = self.load_folders()?;
        ensure_replay_folder_allowed(&folder_path, &folders)?;

        tauri_plugin_opener::open_path(folder_path.to_string_lossy().to_string(), None::<String>)
            .map_err(|error| AppError::other(format!("Failed to open replay folder: {error}")))?;
        Ok(())
    }

    pub fn reveal_entry(&self, path: String) -> Result<(), AppError> {
        let replay_path = PathBuf::from(normalize_path_string(&path)?);
        if !replay_path.is_file() || !is_rofl_file(&replay_path) {
            return Err(AppError::other("Replay entry is not a valid .rofl file"));
        }

        let folders = self.load_folders()?;
        ensure_replay_path_allowed(&replay_path, &folders)?;

        tauri_plugin_opener::reveal_item_in_dir(&replay_path)
            .map_err(|error| AppError::other(format!("Failed to reveal replay entry: {error}")))?;
        Ok(())
    }

    pub async fn prepare_match(
        &self,
        lcu_shard: &LcuShard,
        context: ReplayMatchContext,
    ) -> Result<ReplayMatchState, AppError> {
        validate_game_id(context.game_id)?;
        let lcu = focused_lcu(lcu_shard).await?;
        let configuration = lcu.api().get_replay_configuration().await?;
        let game_version = context
            .game_version
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .or_else(|| {
                if configuration.game_version.trim().is_empty() {
                    None
                } else {
                    Some(configuration.game_version.as_str())
                }
            });

        lcu.api()
            .create_replay_metadata(
                context.game_id,
                game_version,
                context.game_type.as_deref(),
                context.queue_id,
                context.game_end,
            )
            .await?;
        let metadata = lcu.api().get_replay_metadata(context.game_id).await?;

        Ok(ReplayMatchState {
            metadata,
            configuration: Some(configuration),
        })
    }

    pub async fn get_match_metadata(
        &self,
        lcu_shard: &LcuShard,
        game_id: u64,
    ) -> Result<ReplayMatchState, AppError> {
        validate_game_id(game_id)?;
        let lcu = focused_lcu(lcu_shard).await?;
        let metadata = lcu.api().get_replay_metadata(game_id).await?;
        Ok(ReplayMatchState {
            metadata,
            configuration: None,
        })
    }

    pub async fn download_match(
        &self,
        lcu_shard: &LcuShard,
        game_id: u64,
    ) -> Result<ReplayMatchState, AppError> {
        validate_game_id(game_id)?;
        let lcu = focused_lcu(lcu_shard).await?;
        lcu.api().download_replay(game_id).await?;
        let metadata = lcu.api().get_replay_metadata(game_id).await?;
        Ok(ReplayMatchState {
            metadata,
            configuration: None,
        })
    }

    pub async fn watch_match(&self, lcu_shard: &LcuShard, game_id: u64) -> Result<(), AppError> {
        validate_game_id(game_id)?;
        let lcu = focused_lcu(lcu_shard).await?;
        lcu.api().watch_replay(game_id).await
    }

    pub fn play_entry(&self, path: String) -> Result<(), AppError> {
        let replay_path = PathBuf::from(normalize_path_string(&path)?);
        if !replay_path.is_file() || !is_rofl_file(&replay_path) {
            return Err(AppError::other("Replay entry is not a valid .rofl file"));
        }

        let folders = self.load_folders()?;
        ensure_replay_path_allowed(&replay_path, &folders)?;

        let replay_metadata = parser::read_rofl_metadata(&replay_path).map_err(AppError::other)?;
        let replay_version = replay_metadata
            .game_version
            .as_deref()
            .ok_or_else(|| AppError::other("Replay metadata does not expose game version"))?;
        let executables = self.cached_executables()?;
        let executable =
            match_replay_executable(replay_version, &executables).ok_or_else(|| {
                AppError::other(format!(
                    "No League executable matches replay version {replay_version}"
                ))
            })?;
        let executable_path = PathBuf::from(&executable.path);
        let mut command = Command::new(&executable_path);
        command.arg(&replay_path);
        if let Some(game_base_dir) = executable.game_base_dir.as_deref() {
            command.arg(format!("-GameBaseDir={game_base_dir}"));
        }
        command
            .arg("-SkipRads")
            .arg("-SkipBuild")
            .arg("-EnableLNP")
            .arg("-UseNewX3D=1")
            .arg("-UseNewX3DFramebuffers=1");
        if let Some(parent) = executable_path.parent() {
            command.current_dir(parent);
        }

        command.spawn()?;
        Ok(())
    }

    fn cached_executables(&self) -> Result<Vec<ReplayExecutable>, AppError> {
        let executables = self
            .executables
            .read()
            .map_err(|_| AppError::MutexPoisoned)?;
        Ok(executables.clone())
    }

    fn refresh_executables(&self) -> Result<Vec<ReplayExecutable>, AppError> {
        let next = detect_replay_executables();
        let mut executables = self
            .executables
            .write()
            .map_err(|_| AppError::MutexPoisoned)?;
        *executables = next.clone();
        Ok(next)
    }

    fn db(&self) -> Result<Db, AppError> {
        Ok(self
            .db
            .get()
            .ok_or_else(|| AppError::other("Replay shard database is not initialized"))?
            .clone())
    }

    fn tree(&self) -> Result<sled::Tree, AppError> {
        Ok(self.db()?.open_tree(REPLAY_TREE)?)
    }

    fn load_folders(&self) -> Result<Vec<ReplayFolderConfig>, AppError> {
        let tree = self.tree()?;
        let Some(raw) = tree.get(REPLAY_FOLDERS_KEY)? else {
            return Ok(default_replay_folders());
        };
        Ok(serde_json::from_slice::<Vec<ReplayFolderConfig>>(&raw)?)
    }

    fn store_folders(&self, folders: &[ReplayFolderConfig]) -> Result<(), AppError> {
        let tree = self.tree()?;
        let raw = serde_json::to_vec(folders)?;
        tree.insert(REPLAY_FOLDERS_KEY, raw)?;
        tree.flush()?;
        Ok(())
    }
}

#[async_trait]
impl Shard for ReplayShard {
    shard_id!("4b7a2a92-951e-4ca6-b5f5-df6c7cbb4f02");
    depends![PersistenceSled, LcuShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let db = jax.get_shard::<PersistenceSled>().get_db()?;
        if self.db.set(db).is_err() {
            return Err(AppError::other("Replay shard database is already initialized").into());
        }
        self.refresh_executables()?;
        Ok(())
    }
}

async fn focused_lcu(
    lcu_shard: &LcuShard,
) -> Result<Arc<crate::shards::lcu::session::LcuSession>, AppError> {
    let manager = lcu_shard.manager().ok_or(AppError::LcuNotConnected)?;
    manager.focused().await.ok_or(AppError::LcuNotConnected)
}

fn validate_game_id(game_id: u64) -> Result<(), AppError> {
    if game_id == 0 {
        return Err(AppError::other("Replay command requires a valid game id"));
    }
    Ok(())
}

fn normalize_path_string(path: &str) -> Result<String, AppError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(AppError::other("Path cannot be empty"));
    }
    Ok(PathBuf::from(trimmed).to_string_lossy().to_string())
}

fn default_replay_folders() -> Vec<ReplayFolderConfig> {
    let Some(user_profile) = std::env::var_os("USERPROFILE") else {
        return Vec::new();
    };
    let path = PathBuf::from(user_profile)
        .join("Documents")
        .join("League of Legends")
        .join("Replays");

    vec![ReplayFolderConfig {
        path: path.to_string_lossy().to_string(),
        enabled: true,
    }]
}

fn scan_replay_entries(
    folders: &[ReplayFolderConfig],
    executables: &[ReplayExecutable],
) -> Result<Vec<ReplayEntry>, AppError> {
    let mut entries = Vec::new();
    let mut seen = BTreeSet::new();

    for folder in folders.iter().filter(|folder| folder.enabled) {
        let root = PathBuf::from(&folder.path);
        if !root.is_dir() {
            continue;
        }
        scan_replay_dir(&root, executables, &mut seen, &mut entries)?;
    }

    entries.sort_by_key(|entry| Reverse(entry.modified_at_ms));
    Ok(entries)
}

fn scan_replay_dir(
    root: &Path,
    executables: &[ReplayExecutable],
    seen: &mut BTreeSet<String>,
    entries: &mut Vec<ReplayEntry>,
) -> Result<(), AppError> {
    let mut pending = vec![root.to_path_buf()];

    while let Some(dir) = pending.pop() {
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            let metadata = entry.metadata()?;

            if metadata.is_dir() {
                pending.push(path);
                continue;
            }

            if !is_rofl_file(&path) {
                continue;
            }

            let path_string = path.to_string_lossy().to_string();
            if !seen.insert(path_string.clone()) {
                continue;
            }

            let parsed = parse_replay_file_name(&path);
            let rofl_metadata = parser::read_rofl_metadata(&path);
            let (
                patch_version,
                metadata_error,
                game_length_ms,
                last_game_chunk_id,
                last_key_frame_id,
            ) = match rofl_metadata {
                Ok(metadata) => {
                    let metadata_error = if metadata.game_version.is_some() {
                        None
                    } else {
                        Some("Replay metadata does not expose gameVersion".to_string())
                    };
                    (
                        metadata.game_version,
                        metadata_error,
                        metadata.game_length_ms,
                        metadata.last_game_chunk_id,
                        metadata.last_key_frame_id,
                    )
                }
                Err(error) => (None, Some(error), None, None, None),
            };
            let launch_availability =
                resolve_launch_availability(patch_version.as_deref(), executables);
            entries.push(ReplayEntry {
                id: path_string.clone(),
                path: path_string,
                file_name: path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or_default()
                    .to_string(),
                platform_id: parsed.platform_id,
                game_id: parsed.game_id,
                patch_version,
                metadata_error,
                game_length_ms,
                last_game_chunk_id,
                last_key_frame_id,
                file_size_bytes: metadata.len(),
                created_at_ms: system_time_to_epoch_ms(metadata.created().ok()),
                modified_at_ms: system_time_to_epoch_ms(metadata.modified().ok()),
                launch_availability,
            });
        }
    }

    Ok(())
}

fn is_rofl_file(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("rofl"))
}

struct ParsedReplayFileName {
    platform_id: Option<String>,
    game_id: Option<u64>,
}

fn parse_replay_file_name(path: &Path) -> ParsedReplayFileName {
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or_default();

    if let Some((platform, game_id)) = stem.split_once('-') {
        if let Ok(parsed) = game_id.parse::<u64>() {
            return ParsedReplayFileName {
                platform_id: Some(platform.to_string()),
                game_id: Some(parsed),
            };
        }
    }

    ParsedReplayFileName {
        platform_id: None,
        game_id: stem.parse::<u64>().ok(),
    }
}

fn resolve_launch_availability(
    patch_version: Option<&str>,
    executables: &[ReplayExecutable],
) -> ReplayLaunchAvailability {
    if executables.is_empty() {
        return ReplayLaunchAvailability {
            can_launch: false,
            reason: Some("No League executable was detected from Riot installs".to_string()),
            executable_path: None,
        };
    }

    let Some(patch_version) = patch_version else {
        return ReplayLaunchAvailability {
            can_launch: false,
            reason: Some("Replay metadata does not expose game version".to_string()),
            executable_path: None,
        };
    };

    let Some(executable) = match_replay_executable(patch_version, executables) else {
        return ReplayLaunchAvailability {
            can_launch: false,
            reason: Some(format!(
                "No League executable matches replay version {patch_version}"
            )),
            executable_path: None,
        };
    };

    ReplayLaunchAvailability {
        can_launch: true,
        reason: None,
        executable_path: Some(executable.path.clone()),
    }
}

fn detect_replay_executables() -> Vec<ReplayExecutable> {
    discover_lol_client_installs()
        .into_iter()
        .map(|install| {
            let game_version = install.game_version;
            let label = game_version
                .as_deref()
                .and_then(version_major_minor)
                .map(|version| format!("Patch {version}"))
                .unwrap_or_else(|| "League of Legends".to_string());

            ReplayExecutable {
                path: install.game_executable_path.to_string_lossy().to_string(),
                label,
                game_base_dir: Some(install.game_base_dir.to_string_lossy().to_string()),
                game_version,
                exists: install.game_executable_path.is_file(),
            }
        })
        .collect()
}

fn match_replay_executable<'a>(
    replay_version: &str,
    executables: &'a [ReplayExecutable],
) -> Option<&'a ReplayExecutable> {
    let replay_version = normalize_version_string(replay_version)?;
    if let Some(executable) = executables.iter().find(|executable| {
        executable
            .game_version
            .as_deref()
            .and_then(normalize_version_string)
            .is_some_and(|version| version == replay_version)
    }) {
        return Some(executable);
    }

    let replay_patch = version_major_minor(&replay_version)?;
    executables.iter().find(|executable| {
        executable
            .game_version
            .as_deref()
            .and_then(version_major_minor)
            .is_some_and(|version| version == replay_patch)
    })
}

fn normalize_version_string(version: &str) -> Option<String> {
    let version = version.trim_matches(char::from(0)).trim();
    if version.is_empty() {
        return None;
    }
    Some(version.to_string())
}

fn version_major_minor(version: &str) -> Option<String> {
    let version = normalize_version_string(version)?;
    let mut parts = version.split('.');
    let major = parts.next()?.trim();
    let minor = parts.next()?.trim();
    if major.is_empty() || minor.is_empty() {
        return None;
    }
    Some(format!("{major}.{minor}"))
}

fn ensure_replay_path_allowed(
    replay_path: &Path,
    folders: &[ReplayFolderConfig],
) -> Result<(), AppError> {
    let replay_path = replay_path.canonicalize()?;
    for folder in folders.iter().filter(|folder| folder.enabled) {
        let folder_path = PathBuf::from(&folder.path);
        if !folder_path.is_dir() {
            continue;
        }

        if replay_path.starts_with(folder_path.canonicalize()?) {
            return Ok(());
        }
    }

    Err(AppError::other(
        "Replay entry is not inside a registered replay folder",
    ))
}

fn ensure_replay_folder_allowed(
    folder_path: &Path,
    folders: &[ReplayFolderConfig],
) -> Result<(), AppError> {
    let folder_path = folder_path.canonicalize()?;
    for folder in folders.iter().filter(|folder| folder.enabled) {
        let configured_path = PathBuf::from(&folder.path);
        if !configured_path.is_dir() {
            continue;
        }

        if folder_path == configured_path.canonicalize()? {
            return Ok(());
        }
    }

    Err(AppError::other(
        "Replay folder is not a registered replay folder",
    ))
}

fn system_time_to_epoch_ms(time: Option<SystemTime>) -> Option<i64> {
    let duration = time?.duration_since(UNIX_EPOCH).ok()?;
    i64::try_from(duration.as_millis()).ok()
}
