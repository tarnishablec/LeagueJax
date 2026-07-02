use serde::Deserialize;
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};

const LEAGUE_GAME_EXE: &str = "League of Legends.exe";
const RIOT_CLIENT_SERVICES_EXE: &str = "RiotClientServices.exe";
const RIOT_CLIENT_INSTALLS_FILE: &str = "RiotClientInstalls.json";
const RIOT_GAMES_DATA_DIR: &str = "Riot Games";
const RIOT_LEAGUE_METADATA_DIR: &str = "league_of_legends.live";
const RIOT_LEAGUE_PRODUCT_SETTINGS_FILE: &str = "league_of_legends.live.product_settings.yaml";
const TENCENT_INSTALL_MARKER_DIR: &str = "TCLS";

#[derive(Deserialize)]
pub struct RiotInstalls {
    #[serde(default)]
    pub associated_client: BTreeMap<String, PathBuf>,
}

#[derive(Deserialize)]
struct RiotLeagueProductSettings {
    product_install_full_path: Option<PathBuf>,
}

#[derive(Debug, Clone)]
pub struct LolClientInstall {
    pub family: LolClientInstallFamily,
    pub game_executable_path: PathBuf,
    pub game_base_dir: PathBuf,
    pub game_version: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum LolClientInstallFamily {
    Tencent,
    Riot,
}

pub fn riot_installs_path() -> Option<PathBuf> {
    riot_games_data_dir().map(|data_dir| data_dir.join(RIOT_CLIENT_INSTALLS_FILE))
}

fn riot_games_data_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("ProgramData")
            .map(PathBuf::from)
            .filter(|path| !path.as_os_str().is_empty())
            .map(|path| path.join(RIOT_GAMES_DATA_DIR))
    }

    #[cfg(target_os = "macos")]
    {
        Some(PathBuf::from("/Users/Shared").join(RIOT_GAMES_DATA_DIR))
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        None
    }
}

fn riot_league_product_settings_path() -> Option<PathBuf> {
    riot_games_data_dir().map(|data_dir| {
        data_dir
            .join("Metadata")
            .join(RIOT_LEAGUE_METADATA_DIR)
            .join(RIOT_LEAGUE_PRODUCT_SETTINGS_FILE)
    })
}

pub fn extract_riot_client_service_paths(data: &str) -> Option<Vec<PathBuf>> {
    let installs: RiotInstalls = serde_json::from_str(data).ok()?;
    Some(installs.associated_client.into_values().collect())
}

pub fn discover_lol_client_installs() -> Vec<LolClientInstall> {
    let Some(path) = riot_installs_path() else {
        return Vec::new();
    };
    let Ok(data) = std::fs::read_to_string(path) else {
        return Vec::new();
    };
    discover_lol_client_installs_from_data(&data)
}

pub fn discover_lol_client_installs_from_data(data: &str) -> Vec<LolClientInstall> {
    discover_lol_client_installs_from_data_with_riot_executable(data, find_riot_league_executable())
}

fn discover_lol_client_installs_from_data_with_riot_executable(
    data: &str,
    riot_game_executable_path: Option<PathBuf>,
) -> Vec<LolClientInstall> {
    let Some(client_paths) = extract_riot_client_service_paths(data) else {
        return Vec::new();
    };

    let mut seen = BTreeSet::new();
    let mut installs = Vec::new();

    for riot_client_services_path in client_paths {
        if !is_riot_client_services_executable(&riot_client_services_path) {
            continue;
        }

        let Some(root) = install_root_from_riot_client_services_path(&riot_client_services_path)
        else {
            continue;
        };
        let family = detect_install_family(&root);

        let game_executable_path = match family {
            LolClientInstallFamily::Tencent => {
                find_tencent_league_executable(&riot_client_services_path)
            }
            LolClientInstallFamily::Riot => riot_game_executable_path.clone(),
        };
        let Some(game_executable_path) = game_executable_path else {
            continue;
        };
        if !game_executable_path.is_file() || !is_league_game_executable(&game_executable_path) {
            continue;
        }

        let path_key = game_executable_path
            .canonicalize()
            .unwrap_or_else(|_| game_executable_path.clone())
            .to_string_lossy()
            .to_lowercase();
        if !seen.insert(path_key) {
            continue;
        }

        let Some(game_base_dir) = game_executable_path
            .parent()
            .and_then(|game_dir| game_dir.parent())
            .map(Path::to_path_buf)
        else {
            continue;
        };

        installs.push(LolClientInstall {
            family,
            game_version: read_file_version(&game_executable_path),
            game_executable_path,
            game_base_dir,
        });
    }

    installs.sort_by(|a, b| {
        b.game_version
            .cmp(&a.game_version)
            .then_with(|| a.family.cmp(&b.family))
            .then_with(|| a.game_executable_path.cmp(&b.game_executable_path))
    });
    installs
}

pub fn find_tencent_league_executable(riot_client_services_path: &Path) -> Option<PathBuf> {
    if !is_riot_client_services_executable(riot_client_services_path) {
        return None;
    }

    let root = install_root_from_riot_client_services_path(riot_client_services_path)?;
    if detect_install_family(&root) != LolClientInstallFamily::Tencent {
        return None;
    }

    let game_executable_path = root.join("Game").join(LEAGUE_GAME_EXE);
    if game_executable_path.is_file() && is_league_game_executable(&game_executable_path) {
        Some(game_executable_path)
    } else {
        None
    }
}

pub fn find_riot_league_executable() -> Option<PathBuf> {
    let settings_path = riot_league_product_settings_path()?;
    let data = std::fs::read_to_string(settings_path).ok()?;
    let game_executable_path = riot_league_executable_path_from_product_settings_data(&data)?;
    if game_executable_path.is_file() && is_league_game_executable(&game_executable_path) {
        Some(game_executable_path)
    } else {
        None
    }
}

fn riot_league_executable_path_from_product_settings_data(data: &str) -> Option<PathBuf> {
    let settings: RiotLeagueProductSettings = serde_norway::from_str(data).ok()?;
    let install_path = settings.product_install_full_path?;
    if install_path.as_os_str().is_empty() {
        return None;
    }
    Some(install_path.join("Game").join(LEAGUE_GAME_EXE))
}

fn install_root_from_riot_client_services_path(path: &Path) -> Option<PathBuf> {
    path.parent()?.parent().map(Path::to_path_buf)
}

fn detect_install_family(root: &Path) -> LolClientInstallFamily {
    if root.join(TENCENT_INSTALL_MARKER_DIR).is_dir() {
        LolClientInstallFamily::Tencent
    } else {
        LolClientInstallFamily::Riot
    }
}

fn is_league_game_executable(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case(LEAGUE_GAME_EXE))
}

fn is_riot_client_services_executable(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case(RIOT_CLIENT_SERVICES_EXE))
}

#[cfg(target_os = "windows")]
fn read_file_version(path: &Path) -> Option<String> {
    use std::ffi::c_void;
    use std::os::windows::ffi::OsStrExt;
    use std::ptr::null_mut;
    use windows_sys::Win32::Storage::FileSystem::{
        GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW, VS_FIXEDFILEINFO,
    };

    let wide_path = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let mut handle = 0;
    let size = unsafe { GetFileVersionInfoSizeW(wide_path.as_ptr(), &mut handle) };
    if size == 0 {
        return None;
    }

    let mut buffer = vec![0u8; usize::try_from(size).ok()?];
    let ok = unsafe {
        GetFileVersionInfoW(
            wide_path.as_ptr(),
            0,
            size,
            buffer.as_mut_ptr().cast::<c_void>(),
        )
    };
    if ok == 0 {
        return None;
    }

    let root = "\\"
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let mut version_ptr = null_mut::<c_void>();
    let mut version_len = 0;
    let ok = unsafe {
        VerQueryValueW(
            buffer.as_ptr().cast::<c_void>(),
            root.as_ptr(),
            &mut version_ptr,
            &mut version_len,
        )
    };
    if ok == 0 || version_ptr.is_null() {
        return None;
    }

    let info = unsafe { &*(version_ptr.cast::<VS_FIXEDFILEINFO>()) };
    let major = info.dwFileVersionMS >> 16;
    let minor = info.dwFileVersionMS & 0xffff;
    let build = info.dwFileVersionLS >> 16;
    let revision = info.dwFileVersionLS & 0xffff;
    Some(format!("{major}.{minor}.{build}.{revision}"))
}

#[cfg(not(target_os = "windows"))]
fn read_file_version(_path: &Path) -> Option<String> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_riot_client_service_values_only() -> Result<(), String> {
        let data = r#"{
            "associated_client": {
                "D:/Riot Games/League of Legends/": "D:/Riot Games/Riot Client/RiotClientServices.exe",
                "D:/WeGameApps/LeagueCN/LeagueClient/": "D:/WeGameApps/LeagueCN/riot client/riotclientservices.exe"
            }
        }"#;

        let paths = extract_riot_client_service_paths(data)
            .ok_or_else(|| "paths were not parsed".to_string())?;

        assert!(paths.contains(&PathBuf::from(
            "D:/Riot Games/Riot Client/RiotClientServices.exe"
        )));
        assert!(paths.contains(&PathBuf::from(
            "D:/WeGameApps/LeagueCN/riot client/riotclientservices.exe"
        )));
        assert_eq!(paths.len(), 2);
        Ok(())
    }

    #[test]
    fn install_root_comes_from_riot_client_services_parent() {
        let root = install_root_from_riot_client_services_path(Path::new(
            "D:/WeGameApps/LeagueCN/riot client/riotclientservices.exe",
        ));

        assert_eq!(root.as_deref(), Some(Path::new("D:/WeGameApps/LeagueCN")));
    }

    #[test]
    fn tcls_marker_identifies_tencent_install() -> Result<(), std::io::Error> {
        let root = PathBuf::from("target").join("lcu-install-family-test");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join(TENCENT_INSTALL_MARKER_DIR))?;

        assert_eq!(
            detect_install_family(&root),
            LolClientInstallFamily::Tencent
        );

        let _ = std::fs::remove_dir_all(&root);
        Ok(())
    }

    #[test]
    fn tencent_finder_uses_tcls_root_game_directory() -> Result<(), std::io::Error> {
        let root = PathBuf::from("target").join("lcu-tencent-finder-test");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join(TENCENT_INSTALL_MARKER_DIR))?;
        let game_executable_path = create_fake_league_executable(&root)?;
        let riot_client_services_path = root.join("riot client").join(RIOT_CLIENT_SERVICES_EXE);

        assert_eq!(
            find_tencent_league_executable(&riot_client_services_path),
            Some(game_executable_path)
        );

        let _ = std::fs::remove_dir_all(&root);
        Ok(())
    }

    #[test]
    fn tencent_finder_requires_tcls_marker() -> Result<(), std::io::Error> {
        let root = PathBuf::from("target").join("lcu-tencent-marker-test");
        let _ = std::fs::remove_dir_all(&root);
        let _game_executable_path = create_fake_league_executable(&root)?;
        let riot_client_services_path = root.join("riot client").join(RIOT_CLIENT_SERVICES_EXE);

        assert_eq!(
            find_tencent_league_executable(&riot_client_services_path),
            None
        );

        let _ = std::fs::remove_dir_all(&root);
        Ok(())
    }

    #[test]
    fn riot_product_settings_uses_product_install_full_path() -> Result<(), String> {
        let data = r#"
settings:
    locale: "zh_TW"
product_install_full_path: "E:/Games/Riot/League of Legends"
product_install_root: "E:/Games/Riot"
"#;

        let path = riot_league_executable_path_from_product_settings_data(data)
            .ok_or_else(|| "riot League executable path was not parsed".to_string())?;

        assert_eq!(
            path,
            PathBuf::from("E:/Games/Riot/League of Legends")
                .join("Game")
                .join(LEAGUE_GAME_EXE)
        );
        Ok(())
    }

    #[test]
    fn riot_product_settings_supports_unquoted_values() -> Result<(), String> {
        let data = r#"
product_install_full_path: E:/Games/Riot/League of Legends # install path
settings:
    product_install_full_path: "ignored"
"#;

        let path = riot_league_executable_path_from_product_settings_data(data)
            .ok_or_else(|| "riot League executable path was not parsed".to_string())?;

        assert_eq!(
            path,
            PathBuf::from("E:/Games/Riot/League of Legends")
                .join("Game")
                .join(LEAGUE_GAME_EXE)
        );
        Ok(())
    }

    #[test]
    fn discover_tencent_install_uses_tencent_finder() -> Result<(), std::io::Error> {
        let root = PathBuf::from("target").join("lcu-tencent-discovery-test");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join(TENCENT_INSTALL_MARKER_DIR))?;
        let game_executable_path = create_fake_league_executable(&root)?;
        let riot_client_services_path = root.join("riot client").join(RIOT_CLIENT_SERVICES_EXE);
        let data = associated_client_data(&riot_client_services_path);

        let installs = discover_lol_client_installs_from_data_with_riot_executable(&data, None);

        assert_eq!(installs.len(), 1);
        assert_eq!(installs[0].family, LolClientInstallFamily::Tencent);
        assert_eq!(installs[0].game_executable_path, game_executable_path);
        assert_eq!(installs[0].game_base_dir, root);

        let _ = std::fs::remove_dir_all(&installs[0].game_base_dir);
        Ok(())
    }

    #[test]
    fn discover_riot_install_uses_resolved_product_settings_executable(
    ) -> Result<(), std::io::Error> {
        let root = PathBuf::from("target").join("lcu-riot-discovery-test");
        let configured_league_root = root.join("custom league location");
        let _ = std::fs::remove_dir_all(&root);
        let game_executable_path = create_fake_league_executable(&configured_league_root)?;
        let riot_client_services_path = root.join("Riot Client").join(RIOT_CLIENT_SERVICES_EXE);
        let data = associated_client_data(&riot_client_services_path);

        let installs = discover_lol_client_installs_from_data_with_riot_executable(
            &data,
            Some(game_executable_path.clone()),
        );

        assert_eq!(installs.len(), 1);
        assert_eq!(installs[0].family, LolClientInstallFamily::Riot);
        assert_eq!(installs[0].game_executable_path, game_executable_path);
        assert_eq!(installs[0].game_base_dir, configured_league_root);

        let _ = std::fs::remove_dir_all(&root);
        Ok(())
    }

    fn create_fake_league_executable(root: &Path) -> Result<PathBuf, std::io::Error> {
        let game_dir = root.join("Game");
        std::fs::create_dir_all(&game_dir)?;
        let game_executable_path = game_dir.join(LEAGUE_GAME_EXE);
        std::fs::write(&game_executable_path, b"")?;
        Ok(game_executable_path)
    }

    fn associated_client_data(riot_client_services_path: &Path) -> String {
        let riot_client_services_path = riot_client_services_path.to_string_lossy().to_string();
        serde_json::json!({
            "associated_client": {
                "D:/ignored/LeagueClient/": riot_client_services_path
            }
        })
        .to_string()
    }
}
