mod commands;
mod error;
mod jax;
mod lcu;
mod shards;
mod storage;

use std::sync::Arc;

use tauri::Manager;

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, apply_mica};

#[cfg(target_os = "macos")]
use window_vibrancy::apply_acrylic;

use crate::commands::history::{
    get_current_summoner, get_match_detail, get_match_history, save_search_history, search_summoner,
};
use crate::lcu::LcuAuth;
use crate::shards::lcu::LcuShard;
use jax::{Jax, ShardInfo};
use storage::SqliteDb;
// ─── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_shards(jax: tauri::State<Arc<Jax>>) -> Vec<ShardInfo> {
    jax.shard_info()
}

#[tauri::command]
fn lcu_switch_to(port: u16, token: String, jax: tauri::State<Arc<Jax>>) {
    let auth = LcuAuth::new(port, token);
    jax.get_shard::<LcuShard>().switch_to(auth);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "league_jax_lib=debug".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_shards,
            lcu_switch_to,
            get_current_summoner,
            search_summoner,
            get_match_history,
            get_match_detail,
            save_search_history,
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();

            let win = app.get_webview_window("main").expect("no main window");

            #[cfg(target_os = "windows")]
            {
                if apply_mica(&win, None).is_err() {
                    let _ = apply_acrylic(&win, Some((18, 18, 28, 160)));
                }
            }

            #[cfg(target_os = "macos")]
            {
                let _ = apply_acrylic(&win, Some((18, 18, 28, 160)));
            }

            let data_dir = app.path().app_data_dir().expect("no app data dir");
            std::fs::create_dir_all(&data_dir)?;
            let db =
                SqliteDb::open(&data_dir.join("league-jax.db")).expect("failed to open database");

            // ── Jax lifecycle: build → register → start ──
            let mut jax = Jax::new(&app_handle, db);

            jax.register(Arc::new(shards::lcu::LcuShard::new()));
            jax.register(Arc::new(shards::auto_select::AutoSelectShard::new()));
            jax.register(Arc::new(shards::auto_gameflow::AutoGameflowShard::new()));
            jax.register(Arc::new(shards::auto_reply::AutoReplyShard::new()));
            jax.register(Arc::new(shards::ongoing_game::OngoingGameShard::new()));
            jax.register(Arc::new(shards::saved_player::SavedPlayerShard::new()));
            jax.register(Arc::new(shards::statistics::StatisticsShard::new()));
            jax.register(Arc::new(shards::keyboard::KeyboardShard::new()));
            jax.register(Arc::new(shards::tray::TrayShard::new()));
            jax.register(Arc::new(shards::updater::UpdaterShard::new()));

            let jax = Arc::new(jax);
            app.manage(jax.clone());
            jax.start();

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
