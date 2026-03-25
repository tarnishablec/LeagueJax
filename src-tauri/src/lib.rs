mod commands;
mod error;
mod shards;
mod storage;
mod utils;

use std::sync::Arc;
use tauri::{Emitter, Manager, RunEvent};

use crate::commands::history::*;
use crate::commands::lcu::*;
use crate::commands::map::*;
use crate::commands::platform::*;
use crate::commands::settings::*;
use crate::commands::shards::*;

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, apply_mica};

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
        .with_file(true)
        .with_line_number(true)
        .with_target(true)
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            lcu_update_focus,
            get_current_summoner,
            get_current_sgp_server_id,
            get_sgp_servers_config,
            search_summoner,
            search_summoners,
            get_summoner_by_puuid,
            get_ranked_summary,
            get_match_summaries,
            get_match_summary,
            get_cherry_augments,
            lcu_get_maps,
            lcu_get_queues,
            lcu_get_game_version,
            get_settings_bootstrap,
            apply_settings_patch,
            get_shards_status,
            lcu_get_platform_config_namespaces,
            lcu_get_help
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();

            let win = app.get_webview_window("main").expect("no main window");
            // win.open_devtools();

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
                .register(Arc::new(shards::settings::SettingsShard::new()))
                .register(Arc::new(shards::log::LogShard::new()))
                .register(Arc::new(shards::file_logger::FileLoggerShard::new()))
                .register(Arc::new(shards::lcu::LcuShard::new()))
                .register(Arc::new(shards::league_bridge::LeagueBridgeShard::new()))
                .register(Arc::new(shards::static_cache::StaticCacheShard::new()))
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

            let app_handle_for_emit = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match jax.start().await {
                    Ok(report) => {
                        if report.is_success() {
                            tracing::info!("🚀 Jax started successfully with all shards.");
                        } else {
                            for f in &report.failed {
                                tracing::error!(
                                    shard_id = %f.id,
                                    error = %f.error,
                                    "❌ Shard failed to setup"
                                );
                            }
                            for s in &report.skipped {
                                tracing::warn!(
                                    shard_id = %s,
                                    "skip" = true,
                                    "⚠️ Shard skipped due to dependency failure"
                                );
                            }
                        }

                        // Emit shard status event for frontend
                        let snapshot = build_shards_snapshot(&jax);
                        if let Err(e) = app_handle_for_emit.emit("shards_status_changed", &snapshot)
                        {
                            tracing::error!(error = %e, "Failed to emit shards_status_changed");
                        }
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "🚨 Jax encountered a critical startup error");
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                let jax = app.state::<Arc<Jax>>();
                let jax = Arc::clone(&jax);
                jax.get_shard::<shards::tauri_host::TauriHost>()
                    .initiate_shutdown();
                tauri::async_runtime::block_on(async move {
                    if let Err(e) = jax.stop().await {
                        tracing::error!(error = %e, "Jax shutdown error");
                    }
                });
                std::process::exit(0);
            }
        });
}
