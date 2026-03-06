use tauri::AppHandle;

/// Lightweight wrapper around tauri-plugin-store.
/// Configuration access from Rust uses the plugin's StoreExt trait (added per-module as needed).
pub struct StoreManager {
    #[allow(dead_code)]
    app: AppHandle,
}

impl StoreManager {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}
