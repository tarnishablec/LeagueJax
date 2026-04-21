mod commands;
mod error;
mod network_config;
mod shards;
mod storage;
mod utils;

use std::error::Error;
use std::io::{self, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, RunEvent};
use tracing_appender::non_blocking::{NonBlocking, WorkerGuard};
use tracing_subscriber::filter::filter_fn;
use tracing_subscriber::fmt::writer::MakeWriter;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::Layer;

use crate::commands::history::*;
use crate::commands::lcu::*;
use crate::commands::map::*;
use crate::commands::mini_window::*;
use crate::commands::ongoing_game::*;
use crate::commands::platform::*;
use crate::commands::settings::*;
use crate::commands::shards::*;
use crate::commands::updater::*;

use jax::Jax;
use jax_probes::TimingProbe;

#[derive(Clone)]
struct FileLoggingHandle {
    inner: Arc<Mutex<FileLoggingState>>,
}

struct FileLoggingState {
    writer: Option<NonBlocking>,
    guard: Option<WorkerGuard>,
}

impl FileLoggingHandle {
    fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(FileLoggingState {
                writer: None,
                guard: None,
            })),
        }
    }

    fn enable(&self, log_dir: &Path, file_name: &str) -> Result<(), io::Error> {
        std::fs::create_dir_all(log_dir)?;
        let file_appender = tracing_appender::rolling::never(log_dir, file_name);
        let (writer, guard) = tracing_appender::non_blocking(file_appender);

        if let Ok(mut state) = self.inner.lock() {
            state.writer = Some(writer);
            state.guard = Some(guard);
        }

        Ok(())
    }

    fn disable(&self) {
        if let Ok(mut state) = self.inner.lock() {
            state.writer = None;
            state.guard = None;
        }
    }

    fn current_writer(&self) -> Option<NonBlocking> {
        self.inner.lock().ok()?.writer.clone()
    }
}

#[derive(Clone)]
struct SwitchableFileMakeWriter {
    file_logging: FileLoggingHandle,
}

impl SwitchableFileMakeWriter {
    fn new(file_logging: FileLoggingHandle) -> Self {
        Self { file_logging }
    }
}

struct SwitchableFileWriter {
    file_logging: FileLoggingHandle,
}

impl<'a> MakeWriter<'a> for SwitchableFileMakeWriter {
    type Writer = SwitchableFileWriter;

    fn make_writer(&'a self) -> Self::Writer {
        SwitchableFileWriter {
            file_logging: self.file_logging.clone(),
        }
    }
}

impl Write for SwitchableFileWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        if let Some(mut writer) = self.file_logging.current_writer() {
            writer.write(buf)
        } else {
            Ok(buf.len())
        }
    }

    fn flush(&mut self) -> io::Result<()> {
        if let Some(mut writer) = self.file_logging.current_writer() {
            writer.flush()
        } else {
            Ok(())
        }
    }
}

struct TracingState {
    file_logging: FileLoggingHandle,
}

impl TracingState {
    fn file_logging_handle(&self) -> FileLoggingHandle {
        self.file_logging.clone()
    }
}

fn init_tracing<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<TracingState, Box<dyn Error>> {
    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "league_jax_lib=debug".into());

    let local_timer = tracing_subscriber::fmt::time::LocalTime::rfc_3339();
    let console_layer = tracing_subscriber::fmt::layer()
        .with_timer(local_timer)
        .with_file(true)
        .with_line_number(true)
        .with_target(true)
        .with_filter(env_filter);

    // File layer — enabled in all builds
    let file_logging = FileLoggingHandle::new();
    let local_timer = tracing_subscriber::fmt::time::LocalTime::rfc_3339();
    let file_layer = tracing_subscriber::fmt::layer()
        .with_timer(local_timer)
        .with_ansi(false)
        .with_file(true)
        .with_line_number(true)
        .with_target(true)
        .with_writer(SwitchableFileMakeWriter::new(file_logging.clone()))
        .with_filter(filter_fn(|metadata| {
            metadata.target().starts_with("league_jax_lib")
                || matches!(metadata.target(), "lcu_ws_raw" | "lcu_http" | "sgp_http")
        }));

    tracing_subscriber::registry()
        .with(console_layer)
        .with(file_layer)
        .init();
    let _ = app;
    Ok(TracingState { file_logging })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            lcu_get_help,
            toggle_mini_window,
            execute_setting_action,
            get_updater_state,
            run_updater_action
        ])
        .setup(move |app| {
            let tracing_state = init_tracing(app)?;
            app.manage(tracing_state);

            let app_handle = app.handle().clone();

            #[cfg(target_os = "windows")]
            {
                #[cfg(not(debug_assertions))]
                {
                    let win = app.get_webview_window("main").expect("no main window");
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
                .register(Arc::new(shards::window_effect::WindowEffectShard::new()))
                .register(Arc::new(shards::mini_window::MiniWindowShard::new()))
                .register(Arc::new(shards::log::LogShard::new()))
                .register(Arc::new(shards::lcu::LcuShard::new()))
                .register(Arc::new(shards::league_bridge::LeagueBridgeShard::new()))
                .register(Arc::new(shards::static_cache::StaticCacheShard::new()))
                .register(Arc::new(shards::sgp::SgpShard::new()))
                .register(Arc::new(shards::auto_select::AutoSelectShard::new()))
                .register(Arc::new(shards::auto_accept::AutoAcceptShard::new()))
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
                                    "Shard failed to setup"
                                );
                            }
                            for s in &report.skipped {
                                tracing::warn!(
                                    shard_id = %s,
                                    "skip" = true,
                                    "Shard skipped due to dependency failure"
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
                        tracing::error!(error = %e, "Jax encountered a critical startup error");
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
