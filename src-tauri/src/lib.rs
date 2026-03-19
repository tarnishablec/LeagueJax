mod commands;
mod concepts;
mod error;
mod shards;
mod storage;
mod utils;

use std::sync::Arc;
use tauri::Manager;

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, apply_mica};

use crate::commands::history::*;
use crate::commands::lcu::*;
#[cfg(target_os = "macos")]
use window_vibrancy::apply_acrylic;

use jax::Jax;

// ─── Runtime ─────────────────────────────────────────────────────────────────

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
            lcu_update_focus,
            get_current_summoner,
            search_summoner,
            get_match_history,
            get_match_detail,
            get_profile_icon,
            get_champion_icon,
            get_game_version,
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
            let db_path = data_dir.join("data");

            // ── Jax lifecycle: build → register → start ──
            let jax = Jax::default()
                .register(Arc::new(shards::tauri_host::TauriHost::new(app_handle)))
                .register(Arc::new(shards::persistence_sled::PersistenceSled::new(
                    db_path,
                )))
                .register(Arc::new(shards::lcu::LcuShard::new()))
                .register(Arc::new(shards::sgp::SgpShard::new()))
                .register(Arc::new(shards::auto_select::AutoSelectShard::new()))
                .register(Arc::new(shards::auto_gameflow::AutoGameflowShard::new()))
                .register(Arc::new(shards::auto_reply::AutoReplyShard::new()))
                .register(Arc::new(shards::ongoing_game::OngoingGameShard::new()))
                .register(Arc::new(shards::saved_player::SavedPlayerShard::new()))
                .register(Arc::new(shards::statistics::StatisticsShard::new()))
                .register(Arc::new(shards::keyboard::KeyboardShard::new()))
                .register(Arc::new(shards::tray::TrayShard::new()))
                .register(Arc::new(shards::updater::UpdaterShard::new()))
                .build()
                .expect("Jax failed to build: check logs for details");

            let jax = Arc::new(jax);
            app.manage(jax.clone());

            tauri::async_runtime::spawn(async move {
                match jax.start().await {
                    Ok(report) => {
                        if report.is_success() {
                            tracing::info!("🚀 Jax started successfully with all shards.");
                        } else {
                            for f in report.failed {
                                tracing::error!(
                                    shard_id = %f.id,
                                    error = %f.error,
                                    "❌ Shard failed to setup"
                                );
                            }
                            for s in report.skipped {
                                tracing::warn!(
                                    shard_id = %s,
                                    "skip" = true,
                                    "⚠️ Shard skipped due to dependency failure"
                                );
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "🚨 Jax encountered a critical startup error");
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
