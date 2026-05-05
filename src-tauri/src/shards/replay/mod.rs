pub mod parser;
pub mod types;

use core::error::Error;
use std::cmp::Reverse;
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, OnceLock, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};

use self::types::{
    ReplayClient, ReplayClientFamily, ReplayEntry, ReplayFolder, ReplayFolderSource,
    ReplayFolderSourceKind, ReplayLaunchAvailability, ReplayLibrarySnapshot, ReplayMatchContext,
    ReplayMatchState,
};
use crate::error::AppError;
use crate::shards::lcu::session::LcuSession;
use crate::shards::lcu::LcuShard;
use crate::shards::settings::types::{SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::{SettingHandle, SettingsShard};
use crate::utils::league_cmd_arg::LeagueClientCmdArgs;

const REPLAY_FOLDERS_SETTING_ID: &str = "replay.library.folders";

pub struct ReplayShard {
    folders: OnceLock<SettingHandle>,
    clients: RwLock<Vec<ReplayClient>>,
}

impl ReplayShard {
    pub fn new() -> Self {
        Self {
            folders: OnceLock::new(),
            clients: RwLock::new(Vec::new()),
        }
    }

    pub async fn snapshot(&self, lcu_shard: &LcuShard) -> Result<ReplayLibrarySnapshot, AppError> {
        let user_folders = self.load_folders()?;
        let clients = self.refresh_clients(lcu_shard).await?;
        let folders = self
            .build_replay_folders(lcu_shard, &user_folders, &clients)
            .await?;
        let scan_roots = folders
            .iter()
            .map(|folder| folder.path.clone())
            .collect::<Vec<_>>();
        let entries = scan_replay_entries(&scan_roots, &clients)?;

        Ok(ReplayLibrarySnapshot {
            folders,
            clients,
            entries,
        })
    }

    pub async fn scan(&self, lcu_shard: &LcuShard) -> Result<ReplayLibrarySnapshot, AppError> {
        self.snapshot(lcu_shard).await
    }

    pub async fn add_folder(
        &self,
        lcu_shard: &LcuShard,
        path: String,
    ) -> Result<ReplayLibrarySnapshot, AppError> {
        let path = normalize_path_string(&path)?;
        if !Path::new(&path).is_dir() {
            return Err(AppError::other("Replay folder does not exist"));
        }

        let mut folders = self.load_folders()?;
        if !folders.iter().any(|folder| folder == &path) {
            folders.push(path);
            self.store_folders(&folders)?;
        }
        self.snapshot(lcu_shard).await
    }

    pub async fn remove_folder(
        &self,
        lcu_shard: &LcuShard,
        path: String,
    ) -> Result<ReplayLibrarySnapshot, AppError> {
        let path = normalize_path_string(&path)?;
        let mut folders = self.load_folders()?;
        folders.retain(|folder| folder != &path);
        self.store_folders(&folders)?;
        self.snapshot(lcu_shard).await
    }

    pub async fn open_folder(&self, lcu_shard: &LcuShard, path: String) -> Result<(), AppError> {
        let folder_path = PathBuf::from(normalize_path_string(&path)?);
        if !folder_path.is_dir() {
            return Err(AppError::other("Replay folder does not exist"));
        }

        let folders = self.allowed_folder_paths(lcu_shard).await?;
        ensure_replay_folder_allowed(&folder_path, &folders)?;

        tauri_plugin_opener::open_path(folder_path.to_string_lossy().to_string(), None::<String>)
            .map_err(|error| AppError::other(format!("Failed to open replay folder: {error}")))?;
        Ok(())
    }

    pub async fn reveal_entry(&self, lcu_shard: &LcuShard, path: String) -> Result<(), AppError> {
        let replay_path = PathBuf::from(normalize_path_string(&path)?);
        if !replay_path.is_file() || !is_rofl_file(&replay_path) {
            return Err(AppError::other("Replay entry is not a valid .rofl file"));
        }

        let folders = self.allowed_folder_paths(lcu_shard).await?;
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
        let game_version = if configuration.game_version.trim().is_empty() {
            context
                .game_version
                .as_deref()
                .filter(|value| !value.trim().is_empty())
        } else {
            Some(configuration.game_version.as_str())
        };

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

    pub async fn play_entry(&self, lcu_shard: &LcuShard, path: String) -> Result<(), AppError> {
        let replay_path = PathBuf::from(normalize_path_string(&path)?);
        if !replay_path.is_file() || !is_rofl_file(&replay_path) {
            return Err(AppError::other("Replay entry is not a valid .rofl file"));
        }

        let folders = self.allowed_folder_paths(lcu_shard).await?;
        ensure_replay_path_allowed(&replay_path, &folders)?;

        let parsed = parse_replay_file_name(&replay_path);
        let game_id = parsed
            .game_id
            .ok_or_else(|| AppError::other("Replay file name does not expose a game id"))?;
        validate_game_id(game_id)?;

        let replay_metadata = parser::read_rofl_metadata(&replay_path).map_err(AppError::other)?;
        let replay_version = replay_metadata
            .game_version
            .as_deref()
            .ok_or_else(|| AppError::other("Replay metadata does not expose game version"))?;

        let family = replay_family(parsed.platform_id.as_deref());
        let clients = self.refresh_clients(lcu_shard).await?;
        let availability = resolve_launch_availability(
            parsed.game_id,
            Some(replay_version),
            parsed.platform_id.as_deref(),
            family,
            &clients,
        );

        if !availability.can_launch {
            return Err(AppError::other(availability.reason.unwrap_or_else(|| {
                "Replay cannot be launched by any running client".to_string()
            })));
        }

        let client_pid = availability
            .client_pid
            .ok_or_else(|| AppError::other("Replay matched no running client session"))?;
        let manager = lcu_shard.manager().ok_or(AppError::LcuNotConnected)?;
        let lcu = manager
            .session_for_pid(client_pid)
            .filter(|session| session.is_ready())
            .ok_or_else(|| AppError::other("Matched League client is no longer connected"))?;

        lcu.api().watch_replay(game_id).await?;
        Ok(())
    }

    async fn refresh_clients(&self, lcu_shard: &LcuShard) -> Result<Vec<ReplayClient>, AppError> {
        let next = detect_replay_clients(lcu_shard).await?;
        let mut clients = self.clients.write().map_err(|_| AppError::MutexPoisoned)?;
        *clients = next.clone();
        Ok(next)
    }

    async fn allowed_folder_paths(&self, lcu_shard: &LcuShard) -> Result<Vec<String>, AppError> {
        let user_folders = self.load_folders()?;
        let clients = self.refresh_clients(lcu_shard).await?;
        Ok(self
            .build_replay_folders(lcu_shard, &user_folders, &clients)
            .await?
            .into_iter()
            .map(|folder| folder.path)
            .collect())
    }

    async fn build_replay_folders(
        &self,
        lcu_shard: &LcuShard,
        user_folders: &[String],
        clients: &[ReplayClient],
    ) -> Result<Vec<ReplayFolder>, AppError> {
        let discovered = detect_replay_folder_candidates(lcu_shard, clients).await;
        merge_replay_folder_candidates(user_folders, discovered, default_replay_folders())
    }

    fn folders_setting(&self) -> Result<&SettingHandle, AppError> {
        self.folders
            .get()
            .ok_or_else(|| AppError::other("Replay folders setting is not initialized"))
    }

    fn load_folders(&self) -> Result<Vec<String>, AppError> {
        let value = self.folders_setting()?.get_value()?;
        serde_json::from_value::<Vec<String>>(value)?
            .into_iter()
            .map(|path| normalize_path_string(&path))
            .collect::<Result<Vec<_>, _>>()
    }

    fn store_folders(&self, folders: &[String]) -> Result<(), AppError> {
        self.folders_setting()?
            .set_value(serde_json::to_value(folders)?)?;
        Ok(())
    }
}

#[async_trait]
impl Shard for ReplayShard {
    shard_id!("4b7a2a92-951e-4ca6-b5f5-df6c7cbb4f02");
    depends![SettingsShard, LcuShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let settings = jax.get_shard::<SettingsShard>();
        let folders = settings.register_definition(SettingDefinitionDto {
            id: REPLAY_FOLDERS_SETTING_ID.to_string(),
            label_key: "settings.replay.library.folders.label".to_string(),
            hint_key: None,
            scope: SettingScopeDto::Backend,
            control: None,
            default_value: serde_json::to_value(Vec::<String>::new())?,
            order: None,
            visible: Some(false),
            options: None,
        })?;

        if self.folders.set(folders).is_err() {
            return Err(AppError::other("Replay folders setting is already initialized").into());
        }

        Ok(())
    }
}

async fn focused_lcu(lcu_shard: &LcuShard) -> Result<Arc<LcuSession>, AppError> {
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

fn default_replay_folders() -> Vec<String> {
    let Some(user_profile) = std::env::var_os("USERPROFILE") else {
        return Vec::new();
    };
    let path = PathBuf::from(user_profile)
        .join("Documents")
        .join("League of Legends")
        .join("Replays");

    vec![path.to_string_lossy().to_string()]
}

#[derive(Debug, Clone)]
struct ReplayFolderCandidate {
    path: String,
    source: ReplayFolderSource,
}

fn replay_folder_source(
    kind: ReplayFolderSourceKind,
    client: Option<&ReplayClient>,
) -> ReplayFolderSource {
    ReplayFolderSource {
        kind,
        client_pid: client.map(|client| client.pid),
        client_family: client.map(|client| client.family),
        client_server_id: client.and_then(|client| client.server_id.clone()),
    }
}

async fn detect_replay_folder_candidates(
    lcu_shard: &LcuShard,
    clients: &[ReplayClient],
) -> Vec<ReplayFolderCandidate> {
    let Some(manager) = lcu_shard.manager() else {
        return Vec::new();
    };

    let mut candidates = Vec::new();
    for client in clients {
        let Some(session) = manager
            .session_for_pid(client.pid)
            .filter(|session| session.is_ready())
        else {
            continue;
        };

        match session.api().get_replay_path().await {
            Ok(Some(path)) => candidates.push(ReplayFolderCandidate {
                path,
                source: replay_folder_source(ReplayFolderSourceKind::Client, Some(client)),
            }),
            Ok(None) => {}
            Err(error) => {
                tracing::debug!(
                    pid = client.pid,
                    error = %error,
                    "Failed to read configured LCU replay folder"
                );
            }
        }

        match session.api().get_default_replay_path().await {
            Ok(Some(path)) => candidates.push(ReplayFolderCandidate {
                path,
                source: replay_folder_source(ReplayFolderSourceKind::Default, Some(client)),
            }),
            Ok(None) => {}
            Err(error) => {
                tracing::debug!(
                    pid = client.pid,
                    error = %error,
                    "Failed to read default LCU replay folder"
                );
            }
        }
    }

    candidates
}

fn merge_replay_folder_candidates(
    user_folders: &[String],
    discovered: Vec<ReplayFolderCandidate>,
    fallback_folders: Vec<String>,
) -> Result<Vec<ReplayFolder>, AppError> {
    let mut folders = Vec::new();
    let mut seen = BTreeMap::new();

    for path in user_folders {
        push_replay_folder_candidate(
            &mut folders,
            &mut seen,
            ReplayFolderCandidate {
                path: path.clone(),
                source: replay_folder_source(ReplayFolderSourceKind::User, None),
            },
        )?;
    }

    for candidate in discovered {
        push_replay_folder_candidate(&mut folders, &mut seen, candidate)?;
    }

    if folders.is_empty() {
        for path in fallback_folders {
            push_replay_folder_candidate(
                &mut folders,
                &mut seen,
                ReplayFolderCandidate {
                    path,
                    source: replay_folder_source(ReplayFolderSourceKind::Default, None),
                },
            )?;
        }
    }

    Ok(folders)
}

fn push_replay_folder_candidate(
    folders: &mut Vec<ReplayFolder>,
    seen: &mut BTreeMap<String, usize>,
    candidate: ReplayFolderCandidate,
) -> Result<(), AppError> {
    let path = normalize_path_string(&candidate.path)?;
    let key = replay_folder_merge_key(&path)?;

    if let Some(index) = seen.get(&key).copied() {
        if !folders[index].sources.contains(&candidate.source) {
            folders[index].sources.push(candidate.source);
        }
        return Ok(());
    }

    seen.insert(key, folders.len());
    folders.push(ReplayFolder {
        exists: Path::new(&path).is_dir(),
        path,
        enabled: true,
        sources: vec![candidate.source],
    });
    Ok(())
}

fn replay_folder_merge_key(path: &str) -> Result<String, AppError> {
    let path = normalize_path_string(path)?;
    let path_buf = PathBuf::from(&path);
    let comparable = path_buf.canonicalize().unwrap_or(path_buf);
    let mut key = comparable.to_string_lossy().replace('/', "\\");

    while key.len() > 3 && key.ends_with('\\') {
        key.pop();
    }

    if cfg!(windows) {
        Ok(key.to_ascii_lowercase())
    } else {
        Ok(key)
    }
}

fn scan_replay_entries(
    folders: &[String],
    clients: &[ReplayClient],
) -> Result<Vec<ReplayEntry>, AppError> {
    let mut entries = Vec::new();
    let mut seen = BTreeSet::new();

    for folder in folders {
        let root = PathBuf::from(folder);
        if !root.is_dir() {
            continue;
        }
        scan_replay_dir(&root, clients, &mut seen, &mut entries)?;
    }

    entries.sort_by_key(|entry| Reverse(entry.modified_at_ms));
    Ok(entries)
}

fn scan_replay_dir(
    root: &Path,
    clients: &[ReplayClient],
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
            let family = replay_family(parsed.platform_id.as_deref());
            let launch_availability = resolve_launch_availability(
                parsed.game_id,
                patch_version.as_deref(),
                parsed.platform_id.as_deref(),
                family,
                clients,
            );
            entries.push(ReplayEntry {
                id: path_string.clone(),
                path: path_string,
                file_name: path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .unwrap_or_default()
                    .to_string(),
                platform_id: parsed.platform_id,
                family,
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
    game_id: Option<u64>,
    patch_version: Option<&str>,
    platform_id: Option<&str>,
    family: Option<ReplayClientFamily>,
    clients: &[ReplayClient],
) -> ReplayLaunchAvailability {
    if game_id.is_none() {
        return launch_unavailable("Replay file name does not expose a game id");
    }

    if clients.is_empty() {
        return launch_unavailable("No running League client was detected");
    }

    let Some(platform_id) = platform_id.and_then(normalize_platform_id) else {
        return launch_unavailable("Replay file name does not expose a platform id");
    };

    let Some(family) = family else {
        return launch_unavailable("Replay platform family could not be resolved");
    };

    let same_server_clients = clients
        .iter()
        .filter(|client| {
            client.family == family
                && client
                    .server_id
                    .as_deref()
                    .is_some_and(|server_id| server_id == platform_id)
        })
        .collect::<Vec<_>>();

    if same_server_clients.is_empty() {
        return ReplayLaunchAvailability {
            can_launch: false,
            reason: Some(format!(
                "No running {} client matches server {platform_id}",
                family_label(family)
            )),
            client_pid: None,
            client_family: None,
            client_server_id: None,
            client_game_version: None,
        };
    }

    let Some(patch_version) = patch_version else {
        return launch_unavailable("Replay metadata does not expose game version");
    };

    let Some(client) = match_replay_client(patch_version, &same_server_clients) else {
        return ReplayLaunchAvailability {
            can_launch: false,
            reason: Some(format!(
                "No running {} client for {platform_id} matches replay version {patch_version}",
                family_label(family)
            )),
            client_pid: None,
            client_family: None,
            client_server_id: None,
            client_game_version: None,
        };
    };

    ReplayLaunchAvailability {
        can_launch: true,
        reason: None,
        client_pid: Some(client.pid),
        client_family: Some(client.family),
        client_server_id: client.server_id.clone(),
        client_game_version: client.game_version.clone(),
    }
}

fn launch_unavailable(reason: impl Into<String>) -> ReplayLaunchAvailability {
    ReplayLaunchAvailability {
        can_launch: false,
        reason: Some(reason.into()),
        client_pid: None,
        client_family: None,
        client_server_id: None,
        client_game_version: None,
    }
}

async fn detect_replay_clients(lcu_shard: &LcuShard) -> Result<Vec<ReplayClient>, AppError> {
    let Some(manager) = lcu_shard.manager() else {
        return Ok(Vec::new());
    };

    let focused_pid = manager.focused_pid().await;
    let mut clients = Vec::new();
    for session in manager.ready_sessions() {
        let auth = session.auth();
        let family = client_family(&auth.cmd_args);
        let server_id = client_server_id(&auth.cmd_args);
        let install_dir = session.install_dir().map(ToString::to_string);
        let (game_version, available, reason) = replay_client_configuration(&session).await;

        clients.push(ReplayClient {
            pid: auth.pid,
            label: replay_client_label(family, server_id.as_deref(), auth.pid),
            family,
            server_id,
            game_version,
            install_dir,
            is_focused: focused_pid == Some(auth.pid),
            available,
            reason,
        });
    }

    clients.sort_by(|left, right| {
        family_label(left.family)
            .cmp(family_label(right.family))
            .then_with(|| left.server_id.cmp(&right.server_id))
            .then_with(|| left.pid.cmp(&right.pid))
    });
    Ok(clients)
}

async fn replay_client_configuration(
    session: &Arc<LcuSession>,
) -> (Option<String>, bool, Option<String>) {
    match session.api().get_replay_configuration().await {
        Ok(configuration) => {
            let game_version = normalize_version_string(&configuration.game_version);
            if !configuration.is_replays_enabled {
                return (
                    game_version,
                    false,
                    Some("LCU reports replays are disabled".to_string()),
                );
            }
            (game_version, true, None)
        }
        Err(error) => (
            None,
            false,
            Some(format!("Failed to read LCU replay configuration: {error}")),
        ),
    }
}

fn match_replay_client<'a>(
    replay_version: &str,
    clients: &'a [&'a ReplayClient],
) -> Option<&'a ReplayClient> {
    let replay_version = normalize_version_string(replay_version)?;
    if let Some(client) = clients.iter().copied().find(|client| {
        client.available
            && client
                .game_version
                .as_deref()
                .and_then(normalize_version_string)
                .is_some_and(|version| version == replay_version)
    }) {
        return Some(client);
    }

    let replay_patch = version_major_minor(&replay_version)?;
    clients.iter().copied().find(|client| {
        client.available
            && client
                .game_version
                .as_deref()
                .and_then(version_major_minor)
                .is_some_and(|version| version == replay_patch)
    })
}

fn replay_family(platform_id: Option<&str>) -> Option<ReplayClientFamily> {
    let platform_id = normalize_platform_id(platform_id?)?;
    if is_riot_platform_id(&platform_id) {
        Some(ReplayClientFamily::Riot)
    } else {
        Some(ReplayClientFamily::Tencent)
    }
}

fn client_family(args: &LeagueClientCmdArgs) -> ReplayClientFamily {
    match args {
        LeagueClientCmdArgs::Tencent(_) => ReplayClientFamily::Tencent,
        LeagueClientCmdArgs::Riot(_) => ReplayClientFamily::Riot,
    }
}

fn client_server_id(args: &LeagueClientCmdArgs) -> Option<String> {
    match args {
        LeagueClientCmdArgs::Tencent(args) => normalize_platform_id(&args.rso_platform_id),
        LeagueClientCmdArgs::Riot(args) => riot_region_to_platform_id(&args.region),
    }
}

fn replay_client_label(family: ReplayClientFamily, server_id: Option<&str>, pid: u32) -> String {
    match server_id {
        Some(server_id) => format!("{} {server_id}", family_label(family)),
        None => format!("{} Client #{pid}", family_label(family)),
    }
}

fn family_label(family: ReplayClientFamily) -> &'static str {
    match family {
        ReplayClientFamily::Tencent => "TENCENT",
        ReplayClientFamily::Riot => "RIOT",
    }
}

fn normalize_platform_id(value: &str) -> Option<String> {
    let normalized = value.trim().to_ascii_uppercase();
    if normalized.is_empty() {
        return None;
    }
    Some(normalized)
}

const RIOT_PLATFORM_IDS: &[&str] = &[
    "BR1", "EUN1", "EUW1", "JP1", "KR", "LA1", "LA2", "ME1", "NA1", "OC1", "PBE1", "PH2", "RU",
    "SG2", "TH2", "TR1", "TW2", "VN2",
];

fn is_riot_platform_id(value: &str) -> bool {
    RIOT_PLATFORM_IDS.iter().any(|id| id == &value)
}

fn riot_region_to_platform_id(region: &str) -> Option<String> {
    let region = normalize_platform_id(region)?;
    let platform = match region.as_str() {
        "BR" => "BR1",
        "EUN" | "EUNE" => "EUN1",
        "EUW" => "EUW1",
        "JP" => "JP1",
        "KR" => "KR",
        "LAN" => "LA1",
        "LAS" => "LA2",
        "ME" => "ME1",
        "NA" => "NA1",
        "OCE" => "OC1",
        "PBE" => "PBE1",
        "PH" => "PH2",
        "RU" => "RU",
        "SG" => "SG2",
        "TH" => "TH2",
        "TR" => "TR1",
        "TW" => "TW2",
        "VN" => "VN2",
        value if is_riot_platform_id(value) => value,
        value => value,
    };
    Some(platform.to_string())
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

fn ensure_replay_path_allowed(replay_path: &Path, folders: &[String]) -> Result<(), AppError> {
    let replay_path = replay_path.canonicalize()?;
    for folder in folders {
        let folder_path = PathBuf::from(folder);
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

fn ensure_replay_folder_allowed(folder_path: &Path, folders: &[String]) -> Result<(), AppError> {
    let folder_path = folder_path.canonicalize()?;
    for folder in folders {
        let configured_path = PathBuf::from(folder);
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

#[cfg(test)]
mod tests {
    use super::*;

    fn replay_client(
        pid: u32,
        family: ReplayClientFamily,
        server_id: &str,
        game_version: &str,
    ) -> ReplayClient {
        ReplayClient {
            pid,
            label: replay_client_label(family, Some(server_id), pid),
            family,
            server_id: Some(server_id.to_string()),
            game_version: Some(game_version.to_string()),
            install_dir: None,
            is_focused: false,
            available: true,
            reason: None,
        }
    }

    #[test]
    fn classifies_riot_and_tencent_platform_ids() {
        assert_eq!(replay_family(Some("JP1")), Some(ReplayClientFamily::Riot));
        assert_eq!(
            replay_family(Some("hn1")),
            Some(ReplayClientFamily::Tencent)
        );
        assert_eq!(riot_region_to_platform_id("JP").as_deref(), Some("JP1"));
    }

    #[test]
    fn matches_running_client_by_family_server_and_patch() {
        let clients = vec![
            replay_client(1, ReplayClientFamily::Riot, "JP1", "16.9.772.8292"),
            replay_client(2, ReplayClientFamily::Tencent, "HN1", "16.9.769.5709"),
        ];

        let availability = resolve_launch_availability(
            Some(10),
            Some("16.9.772.1032"),
            Some("JP1"),
            Some(ReplayClientFamily::Riot),
            &clients,
        );

        assert!(availability.can_launch);
        assert_eq!(availability.client_pid, Some(1));
        assert_eq!(availability.client_family, Some(ReplayClientFamily::Riot));
    }

    #[test]
    fn disables_replay_when_family_or_server_does_not_match() {
        let clients = vec![replay_client(
            1,
            ReplayClientFamily::Tencent,
            "HN1",
            "16.9.772.8292",
        )];

        let availability = resolve_launch_availability(
            Some(10),
            Some("16.9.772.1032"),
            Some("JP1"),
            Some(ReplayClientFamily::Riot),
            &clients,
        );

        assert!(!availability.can_launch);
        assert!(availability.reason.is_some());
    }

    #[test]
    fn merges_replay_folders_by_normalized_path() -> Result<(), AppError> {
        let user_path = PathBuf::from("target")
            .join("replay-merge-test")
            .to_string_lossy()
            .to_string();
        let duplicate_path = format!("{}/", user_path.replace('\\', "/"));
        let client = replay_client(7, ReplayClientFamily::Riot, "JP1", "16.9.772.8292");

        let folders = merge_replay_folder_candidates(
            &[user_path.clone()],
            vec![
                ReplayFolderCandidate {
                    path: duplicate_path.clone(),
                    source: replay_folder_source(ReplayFolderSourceKind::Client, Some(&client)),
                },
                ReplayFolderCandidate {
                    path: duplicate_path,
                    source: replay_folder_source(ReplayFolderSourceKind::Default, Some(&client)),
                },
            ],
            Vec::new(),
        )?;

        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].path, user_path);
        assert_eq!(folders[0].sources.len(), 3);
        assert_eq!(folders[0].sources[0].kind, ReplayFolderSourceKind::User);
        assert_eq!(folders[0].sources[1].kind, ReplayFolderSourceKind::Client);
        assert_eq!(folders[0].sources[1].client_pid, Some(7));
        assert_eq!(folders[0].sources[2].kind, ReplayFolderSourceKind::Default);
        Ok(())
    }

    #[test]
    fn uses_fallback_replay_folder_when_no_sources_exist() -> Result<(), AppError> {
        let fallback = PathBuf::from("target")
            .join("replay-fallback-test")
            .to_string_lossy()
            .to_string();

        let folders = merge_replay_folder_candidates(&[], Vec::new(), vec![fallback.clone()])?;

        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].path, fallback);
        assert_eq!(folders[0].sources.len(), 1);
        assert_eq!(folders[0].sources[0].kind, ReplayFolderSourceKind::Default);
        assert_eq!(folders[0].sources[0].client_pid, None);
        Ok(())
    }
}
