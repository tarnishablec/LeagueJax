#![allow(dead_code, unused_imports)]

mod error;
mod lcu;
mod shards;
mod state;
mod storage;

use std::sync::Arc;

use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{sleep, Duration};

use lcu::{LcuConnector, LcuWatcher, WindowsLcuConnector};
use shards::Shard;
use state::AppState;
use storage::SqliteDb;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "league_jax_lib=debug".into()),
        )
        .init();

    // Register all shards at compile time (static dispatch)
    let shards: Vec<Arc<dyn Shard>> = vec![
        Arc::new(shards::auto_select::AutoSelectShard::new()),
        Arc::new(shards::auto_gameflow::AutoGameflowShard::new()),
        Arc::new(shards::auto_reply::AutoReplyShard::new()),
        Arc::new(shards::ongoing_game::OngoingGameShard::new()),
        Arc::new(shards::saved_player::SavedPlayerShard::new()),
        Arc::new(shards::statistics::StatisticsShard::new()),
        Arc::new(shards::keyboard::KeyboardShard::new()),
        Arc::new(shards::tray::TrayShard::new()),
        Arc::new(shards::updater::UpdaterShard::new()),
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(move |app| {
            let app_handle = app.handle().clone();

            let data_dir = app.path().app_data_dir().expect("no app data dir");
            std::fs::create_dir_all(&data_dir)?;
            let db = SqliteDb::open(&data_dir.join("league-jax.db"))
                .expect("failed to open database");

            let state = Arc::new(AppState::new(&app_handle, db));

            // Setup all shards
            for shard in &shards {
                let shard = shard.clone();
                let state = state.clone();
                let app_handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = shard.setup(&app_handle, state).await {
                        tracing::error!("[{}] setup failed: {e}", shard.name());
                    }
                });
            }

            // Start LCU connection monitor
            tauri::async_runtime::spawn(lcu_watcher_loop(
                app_handle.clone(),
                state.clone(),
                shards.clone(),
            ));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Polls for LCU process, manages connection lifecycle
#[allow(unused_assignments)]
async fn lcu_watcher_loop(
    app: AppHandle,
    state: Arc<AppState>,
    shards: Vec<Arc<dyn Shard>>,
) {
    let connector = WindowsLcuConnector;
    let mut connected = false;

    loop {
        let auth = connector.detect().await;

        match (connected, auth) {
            (false, Some(auth)) => {
                tracing::info!("LCU connected on port {}", auth.port);
                if let Err(e) = state.set_lcu_connected(auth.clone()).await {
                    tracing::error!("set_lcu_connected failed: {e}");
                    sleep(Duration::from_secs(2)).await;
                    continue;
                }

                for shard in &shards {
                    if let Err(e) = shard.on_lcu_connected(state.clone()).await {
                        tracing::error!("[{}] on_lcu_connected: {e}", shard.name());
                    }
                }

                let _ = app.emit("lcu-connected", &serde_json::json!({ "port": auth.port }));
                connected = true;

                let shards_clone = shards.clone();
                let state_clone = state.clone();
                let app_clone = app.clone();
                let _ = LcuWatcher::run(&auth, &app_clone, move |event| {
                    let shards = shards_clone.clone();
                    let state = state_clone.clone();
                    tauri::async_runtime::spawn(async move {
                        for shard in &shards {
                            if let Err(e) = shard.on_lcu_event(&event, state.clone()).await {
                                tracing::error!("[{}] on_lcu_event: {e}", shard.name());
                            }
                        }
                    });
                })
                .await;

                tracing::info!("LCU disconnected");
                state.set_lcu_disconnected().await;
                for shard in &shards {
                    if let Err(e) = shard.on_lcu_disconnected(state.clone()).await {
                        tracing::error!("[{}] on_lcu_disconnected: {e}", shard.name());
                    }
                }
                let _ = app.emit("lcu-disconnected", ());
                connected = false;
            }

            (true, None) => {
                connected = false;
            }

            _ => {}
        }

        sleep(Duration::from_millis(500)).await;
    }
}
