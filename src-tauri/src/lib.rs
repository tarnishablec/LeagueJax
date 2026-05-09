mod commands;
mod error;
mod shards;
mod storage;
mod utils;

use std::error::Error;
use std::io::{self, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, RunEvent};
use tracing_appender::non_blocking::{NonBlocking, WorkerGuard};
use tracing_subscriber::fmt::writer::MakeWriter;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::reload;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, Registry};

use crate::commands::auto_accept::*;
use crate::commands::history::*;
use crate::commands::lcu::*;
use crate::commands::map::*;
use crate::commands::mini_window::*;
use crate::commands::ongoing_game::*;
use crate::commands::platform::*;
use crate::commands::replay::*;
use crate::commands::settings::*;
use crate::commands::shards::*;
use crate::commands::updater::*;
use crate::utils::webview::apply_release_webview_hardening;

use jax::Jax;
use jax_probes::TimingProbe;

const DEFAULT_LOG_LEVEL: &str = "info";
const LOG_TARGET_PREFIX: &str = "league_jax_lib";

fn normalize_log_level(value: &str) -> &'static str {
    match value.trim().to_ascii_lowercase().as_str() {
        "error" => "error",
        "warn" => "warn",
        "debug" => "debug",
        "trace" => "trace",
        _ => DEFAULT_LOG_LEVEL,
    }
}

#[derive(Clone)]
struct LogLevelFilterHandle {
    handle: reload::Handle<EnvFilter, Registry>,
}

impl LogLevelFilterHandle {
    fn new(handle: reload::Handle<EnvFilter, Registry>) -> Self {
        Self { handle }
    }

    fn set_level(&self, value: &str) -> Result<(), String> {
        self.handle
            .reload(log_filter(value))
            .map_err(|error| error.to_string())
    }
}

fn log_filter(level: &str) -> EnvFilter {
    EnvFilter::new(format!(
        "{LOG_TARGET_PREFIX}={}",
        normalize_log_level(level)
    ))
}

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
    log_level_filter: LogLevelFilterHandle,
}

impl TracingState {
    fn file_logging_handle(&self) -> FileLoggingHandle {
        self.file_logging.clone()
    }

    fn log_level_filter_handle(&self) -> LogLevelFilterHandle {
        self.log_level_filter.clone()
    }
}

fn init_tracing<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<TracingState, Box<dyn Error>> {
    let (log_filter_layer, log_filter_handle) = reload::Layer::new(log_filter(DEFAULT_LOG_LEVEL));
    let log_level_filter = LogLevelFilterHandle::new(log_filter_handle);

    let local_timer = tracing_subscriber::fmt::time::LocalTime::rfc_3339();
    let console_layer = tracing_subscriber::fmt::layer()
        .with_timer(local_timer)
        .with_file(true)
        .with_line_number(true)
        .with_target(true);

    // File layer — enabled in all builds
    let file_logging = FileLoggingHandle::new();
    let local_timer = tracing_subscriber::fmt::time::LocalTime::rfc_3339();
    let file_layer = tracing_subscriber::fmt::layer()
        .with_timer(local_timer)
        .with_ansi(false)
        .with_file(true)
        .with_line_number(true)
        .with_target(true)
        .with_writer(SwitchableFileMakeWriter::new(file_logging.clone()));

    tracing_subscriber::registry()
        .with(log_filter_layer)
        .with(console_layer)
        .with(file_layer)
        .init();
    let _ = app;
    Ok(TracingState {
        file_logging,
        log_level_filter,
    })
}

fn present_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else {
        tracing::warn!("Main window was not available for single-instance activation");
        return;
    };

    if let Err(error) = window.unminimize() {
        tracing::warn!(error = %error, "Failed to unminimize main window");
    }

    if let Err(error) = window.show() {
        tracing::warn!(error = %error, "Failed to show main window");
    }

    if let Err(error) = window.set_focus() {
        tracing::warn!(error = %error, "Failed to focus main window");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            present_main_window(app);
        }))
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
            auto_accept_accept_ready_check,
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
            get_match_details,
            replay_get_snapshot,
            replay_scan_folders,
            replay_add_folder,
            replay_pick_folder,
            replay_remove_folder,
            replay_open_folder,
            replay_reveal_entry,
            replay_reveal_executable,
            replay_prepare_match,
            replay_get_match_metadata,
            replay_download_match,
            replay_watch_match,
            replay_play_entry,
            get_cherry_augments,
            get_cdragon_cherry_augments_json,
            get_cdragon_arena_json,
            lcu_get_maps,
            lcu_get_queues,
            lcu_get_game_version,
            lcu_get_ranked_tiers,
            lcu_get_chat_friends,
            lcu_get_chat_friend_groups,
            lcu_champ_select_swap_bench_champion,
            lcu_get_pickable_champion_ids,
            lcu_dodge_champ_select,
            lcu_kill_and_restart_ux,
            ongoing_game_get_snapshot,
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
            get_system_locale,
            toggle_mini_window,
            set_mini_pin,
            set_mini_always_on_top,
            mini_window_ready,
            execute_setting_action,
            get_updater_state,
            run_updater_action
        ])
        .setup(move |app| {
            let tracing_state = init_tracing(app)?;
            app.manage(tracing_state);

            let app_handle = app.handle().clone();

            if let Some(window) = app.get_webview_window("main") {
                apply_release_webview_hardening(&window)?;
                let app_handle_for_close = app_handle.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        app_handle_for_close.exit(0);
                    }
                });
            } else {
                tracing::warn!("Main window was not available for WebView hardening");
            }

            let data_dir = app.path().app_data_dir().expect("no app data dir");
            let db_path = data_dir.join("data");

            let timing = Arc::new(TimingProbe::new());
            let startup_report = StartupReportState::default();

            let jax = Jax::default()
                .probe(timing.clone())
                .register(Arc::new(shards::tauri_host::TauriHost::new(app_handle)))
                .register(Arc::new(shards::persistence_sled::PersistenceSled::new(
                    db_path,
                )))
                .register(Arc::new(shards::settings::SettingsShard::new()))
                .register(Arc::new(shards::settings_bridge::SettingsBridgeShard::new()))
                .register(Arc::new(shards::window_effect::WindowEffectShard::new()))
                .register(Arc::new(shards::mini_window::MiniWindowShard::new()))
                .register(Arc::new(shards::log::LogShard::new()))
                .register(Arc::new(shards::network::NetworkShard::new()))
                .register(Arc::new(shards::lcu::LcuShard::new()))
                .register(Arc::new(shards::league_bridge::LeagueBridgeShard::new()))
                .register(Arc::new(shards::static_cache::StaticCacheShard::new()))
                .register(Arc::new(shards::sgp::SgpShard::new()))
                .register(Arc::new(shards::replay::ReplayShard::new()))
                .register(Arc::new(shards::auto_select::AutoSelectShard::new()))
                .register(Arc::new(shards::auto_accept::AutoAcceptShard::new()))
                .register(Arc::new(shards::auto_reply::AutoReplyShard::new()))
                .register(Arc::new(shards::ongoing_game::OngoingGameShard::new()))
                .register(Arc::new(shards::saved_player::SavedPlayerShard::new()))
                .register(Arc::new(shards::statistics::StatisticsShard::new()))
                .register(Arc::new(shards::keyboard::KeyboardShard::new()))
                .register(Arc::new(shards::updater::UpdaterShard::new()))
                .build()
                .expect("Jax failed to build: check logs for details");

            let jax = Arc::new(jax);
            app.manage(jax.clone());
            let timing_for_emit = timing.clone();
            app.manage(timing);
            app.manage(startup_report.clone());

            let app_handle_for_emit = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match jax.start().await {
                    Ok(report) => {
                        if let Err(e) = startup_report.set_report(&report) {
                            tracing::error!(error = %e, "Failed to store Jax startup report");
                        }

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
                        let snapshot =
                            build_shards_snapshot(&jax, &timing_for_emit, &startup_report);
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
