mod commands;
mod error;
mod shards;
mod storage;
mod utils;

use std::error::Error;
#[cfg(debug_assertions)]
use std::fs;
use std::sync::Arc;
use tauri::{Emitter, Manager, RunEvent};
#[cfg(debug_assertions)]
use tracing_subscriber::filter::filter_fn;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::Layer;

use crate::commands::history::*;
use crate::commands::lcu::*;
use crate::commands::map::*;
use crate::commands::ongoing_game::*;
use crate::commands::platform::*;
use crate::commands::settings::*;
use crate::commands::shards::*;

#[cfg(target_os = "windows")]
use window_vibrancy::{apply_acrylic, apply_mica};

#[cfg(target_os = "macos")]
use window_vibrancy::apply_acrylic;

use jax::Jax;
use jax_probes::TimingProbe;

struct TracingState {
    #[cfg(debug_assertions)]
    _lcu_ws_raw_guard: tracing_appender::non_blocking::WorkerGuard,
}

fn init_tracing<R: tauri::Runtime>(
    _app: &tauri::App<R>,
) -> Result<TracingState, Box<dyn Error>> {
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "league_jax_lib=debug".into());

    let console_layer = tracing_subscriber::fmt::layer()
        .with_file(true)
        .with_line_number(true)
        .with_target(true)
        .with_filter(env_filter);

    #[cfg(debug_assertions)]
    {
        let log_dir = _app
            .path()
            .app_data_dir()
            .map_err(|e| -> Box<dyn Error> { Box::from(e.to_string()) })?
            .join("logs")
            .join("ws");
        fs::create_dir_all(&log_dir)?;

        let file_appender = tracing_appender::rolling::daily(log_dir, "lcu-ws-raw.log");
        let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);
        let ws_file_layer = tracing_subscriber::fmt::layer()
            .with_ansi(false)
            .without_time()
            .with_level(false)
            .with_file(false)
            .with_line_number(false)
            .with_target(false)
            .with_writer(non_blocking)
            .with_filter(filter_fn(|metadata| metadata.target() == "lcu_ws_raw"));

        tracing_subscriber::registry()
            .with(console_layer)
            .with(ws_file_layer)
            .init();

        Ok(TracingState {
            _lcu_ws_raw_guard: guard,
        })
    }

    #[cfg(not(debug_assertions))]
    {
        tracing_subscriber::registry().with(console_layer).init();
        Ok(TracingState {})
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .register_asynchronous_uri_scheme_protocol("lcu", |ctx, request, responder| {
            let app_handle = ctx.app_handle().clone();
            tauri::async_runtime::spawn(async move {
                responder.respond(
                    shards::lcu::asset_proxy::handle_lcu_asset_request(app_handle, request).await,
                );
            });
        })
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
            lcu_get_ranked_tiers,
            ongoing_game_refresh,
            ongoing_game_refresh_match_histories,
            ongoing_game_set_match_history_tag,
            ongoing_game_set_match_history_count,
            get_settings_bootstrap,
            set_settings_value,
            set_settings_values,
            get_shards_status,
            lcu_get_platform_config_namespaces,
            lcu_get_help
        ])
        .setup(move |app| {
            let tracing_state = init_tracing(app)?;
            app.manage(tracing_state);

            let app_handle = app.handle().clone();

            let win = app.get_webview_window("main").expect("no main window");

            #[cfg(target_os = "windows")]
            {
                if apply_mica(&win, None).is_err() {
                    let _ = apply_acrylic(&win, Some((18, 18, 28, 160)));
                }

                #[cfg(not(debug_assertions))]
                win.with_webview(|webview| unsafe {
                    let controller = webview.controller();
                    if let Ok(core) = controller.CoreWebView2() {
                        if let Ok(settings) = core.Settings() {
                            let settings = settings;
                            let _ = settings.SetAreDevToolsEnabled(false);
                            let _ = settings.SetAreDefaultContextMenusEnabled(false);
                        }
                    }
                })?;
            }

            #[cfg(target_os = "macos")]
            {
                let _ = apply_acrylic(&win, Some((18, 18, 28, 160)));
            }

            let data_dir = app.path().app_data_dir().expect("no app data dir");
            let db_path = data_dir.join("data");

            let timing = Arc::new(TimingProbe::new());

            let jax = Jax::default()
                .probe(timing.clone())
                .register(Arc::new(shards::tauri_host::TauriHost::new(app_handle)))
                .register(Arc::new(shards::persistence_sled::PersistenceSled::new(
                    db_path,
                )))
                .register(Arc::new(shards::settings::SettingsShard::new()))
                .register(Arc::new(shards::log::LogShard::new()))
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
            let timing_for_emit = timing.clone();
            app.manage(timing);

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
                                    "鉂?Shard failed to setup"
                                );
                            }
                            for s in &report.skipped {
                                tracing::warn!(
                                    shard_id = %s,
                                    "skip" = true,
                                    "鈿狅笍 Shard skipped due to dependency failure"
                                );
                            }
                        }

                        // Emit shard status event for frontend
                        let snapshot = build_shards_snapshot(&jax, &timing_for_emit);
                        if let Err(e) = app_handle_for_emit.emit("shards_status_changed", &snapshot)
                        {
                            tracing::error!(error = %e, "Failed to emit shards_status_changed");
                        }
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "馃毃 Jax encountered a critical startup error");
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
