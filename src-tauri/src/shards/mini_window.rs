use std::sync::{Arc, Mutex, OnceLock};

use async_trait::async_trait;
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use tauri::{Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tokio::sync::Mutex as AsyncMutex;

use crate::error::AppError;
use crate::shards::lcu::manager::LcuManager;
use crate::shards::lcu::LcuShard;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::{SettingHandle, SettingsShard};
use crate::shards::tauri_host::TauriHost;
use crate::shards::window_effect::WindowEffectShard;

const MINI_WINDOW_LABEL: &str = "mini";
const MINI_WINDOW_ROUTE: &str = "/mini";
const MINI_WINDOW_TITLE: &str = "League Jax - Mini";
const MINI_WINDOW_WIDTH: f64 = 420.0;
const MINI_WINDOW_HEIGHT: f64 = 680.0;
const MINI_WINDOW_MIN_WIDTH: f64 = 360.0;
const MINI_WINDOW_MIN_HEIGHT: f64 = 520.0;
const MINI_WINDOW_GAP_PX: i32 = 4;
const MAIN_WINDOW_LABEL: &str = "main";
const MINI_PIN_SETTING_ID: &str = "mini.preference.pin";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
struct Rect {
    x: i32,
    y: i32,
    width: i32,
    height: i32,
}

impl Rect {
    fn new(x: i32, y: i32, width: i32, height: i32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }

    fn right(&self) -> i32 {
        self.x + self.width
    }

    fn approx_eq(&self, other: &Self) -> bool {
        (self.x - other.x).abs() <= 1
            && (self.y - other.y).abs() <= 1
            && (self.width - other.width).abs() <= 1
            && (self.height - other.height).abs() <= 1
    }
}

#[derive(Clone, Copy, Debug, Default)]
struct Insets {
    left: i32,
    top: i32,
}

#[derive(Clone, Copy, Debug)]
struct LeagueWindowTarget {
    pid: u32,
    rect: Rect,
}

#[derive(Debug, Default)]
struct MiniWindowState {
    has_initialized_position: bool,
}

pub struct MiniWindowShard {
    host: OnceLock<Arc<TauriHost>>,
    window_effect: OnceLock<Arc<WindowEffectShard>>,
    lcu: OnceLock<Arc<LcuShard>>,
    lcu_manager: OnceLock<Arc<LcuManager>>,
    pin_setting: OnceLock<SettingHandle>,
    state: Mutex<MiniWindowState>,
    toggle_lock: AsyncMutex<()>,
    follow_controller: native_window::FollowController,
}

impl MiniWindowShard {
    pub fn new() -> Self {
        Self {
            host: OnceLock::new(),
            window_effect: OnceLock::new(),
            lcu: OnceLock::new(),
            lcu_manager: OnceLock::new(),
            pin_setting: OnceLock::new(),
            state: Mutex::new(MiniWindowState::default()),
            toggle_lock: AsyncMutex::new(()),
            follow_controller: native_window::FollowController::new(),
        }
    }

    fn try_apply_window_effect(&self, window: &WebviewWindow) {
        if let Some(window_effect) = self.window_effect.get() {
            if let Err(error) = window_effect.apply_current_to_window(window) {
                tracing::warn!(error = %error, "Failed to apply window effect for mini window");
            }
        } else {
            tracing::warn!("MiniWindowShard window effect shard is not initialized");
        }
    }

    fn current_pin_enabled(&self) -> bool {
        self.pin_setting
            .get()
            .and_then(|handle| handle.get_value().ok())
            .and_then(|value| value.as_bool())
            .unwrap_or(true)
    }

    fn ensure_window(&self) -> Result<WebviewWindow, AppError> {
        let host = self
            .host
            .get()
            .ok_or_else(|| AppError::other("mini window shard is not initialized"))?;
        let app = &host.app;

        if let Some(window) = app.get_webview_window(MINI_WINDOW_LABEL) {
            return Ok(window);
        }

        let window = WebviewWindowBuilder::new(
            app,
            MINI_WINDOW_LABEL,
            WebviewUrl::App(MINI_WINDOW_ROUTE.into()),
        )
        .title(MINI_WINDOW_TITLE)
        .inner_size(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT)
        .min_inner_size(MINI_WINDOW_MIN_WIDTH, MINI_WINDOW_MIN_HEIGHT)
        .decorations(false)
        .transparent(true)
        .maximizable(false)
        .resizable(true)
        .visible(false)
        .focused(false)
        .build()
        .map_err(|error| AppError::other(format!("failed to create mini window: {error}")))?;

        self.try_apply_window_effect(&window);

        Ok(window)
    }

    fn mini_window(&self) -> Option<WebviewWindow> {
        self.host
            .get()
            .and_then(|host| host.app.get_webview_window(MINI_WINDOW_LABEL))
    }

    #[cfg(target_os = "windows")]
    fn mini_window_hwnd(&self, window: &WebviewWindow) -> Result<isize, AppError> {
        let hwnd = window
            .hwnd()
            .map_err(|error| AppError::other(format!("failed to read mini hwnd: {error}")))?;
        Ok(hwnd.0 as isize)
    }

    fn visible_rect(&self, window: &WebviewWindow) -> Result<Rect, AppError> {
        let position = window.inner_position().map_err(|error| {
            AppError::other(format!("failed to read mini inner position: {error}"))
        })?;
        let size = window
            .inner_size()
            .map_err(|error| AppError::other(format!("failed to read mini inner size: {error}")))?;

        Ok(Rect::new(
            position.x,
            position.y,
            i32::try_from(size.width)
                .map_err(|_| AppError::other("mini window inner width exceeded i32 range"))?,
            i32::try_from(size.height)
                .map_err(|_| AppError::other("mini window inner height exceeded i32 range"))?,
        ))
    }

    fn main_window_visible_rect(&self) -> Option<Rect> {
        let main_window = self
            .host
            .get()
            .and_then(|host| host.app.get_webview_window(MAIN_WINDOW_LABEL))?;

        self.visible_rect(&main_window).ok()
    }

    fn frame_insets(&self, window: &WebviewWindow) -> Result<Insets, AppError> {
        let outer_position = window.outer_position().map_err(|error| {
            AppError::other(format!("failed to read mini outer position: {error}"))
        })?;
        let inner_position = window.inner_position().map_err(|error| {
            AppError::other(format!("failed to read mini inner position: {error}"))
        })?;

        Ok(Insets {
            left: inner_position.x - outer_position.x,
            top: inner_position.y - outer_position.y,
        })
    }

    fn mark_initialized(&self) -> Result<(), AppError> {
        let mut state = self.state.lock().map_err(|_| AppError::MutexPoisoned)?;
        state.has_initialized_position = true;
        Ok(())
    }

    fn has_initialized_position(&self) -> Result<bool, AppError> {
        let state = self.state.lock().map_err(|_| AppError::MutexPoisoned)?;
        Ok(state.has_initialized_position)
    }

    fn dock_to_target_right(target: Rect, mini: Rect) -> Rect {
        Rect::new(
            target.right() + MINI_WINDOW_GAP_PX,
            target.y,
            mini.width,
            mini.height,
        )
    }

    fn move_window_to_visible_rect(
        &self,
        window: &WebviewWindow,
        target: Rect,
    ) -> Result<(), AppError> {
        if let Ok(current) = self.visible_rect(window) {
            if current.approx_eq(&target) {
                return Ok(());
            }
        }

        let insets = self.frame_insets(window).unwrap_or_default();
        let outer_position = PhysicalPosition::new(target.x - insets.left, target.y - insets.top);

        window.set_position(outer_position).map_err(|error| {
            AppError::other(format!("failed to set mini window position: {error}"))
        })?;

        Ok(())
    }

    async fn league_client_window_target(&self) -> Option<LeagueWindowTarget> {
        let manager = self.lcu_manager.get()?.clone();

        if let Some(focused_pid) = manager.focused_pid().await {
            if let Some(bounds) = native_window::visible_rect_for_pid(focused_pid) {
                return Some(LeagueWindowTarget {
                    pid: focused_pid,
                    rect: bounds,
                });
            }
        }

        manager.any_ready_session().and_then(|session| {
            let pid = session.auth().pid;
            native_window::visible_rect_for_pid(pid).map(|rect| LeagueWindowTarget { pid, rect })
        })
    }

    async fn prepare_window_for_show(&self, window: &WebviewWindow) -> Result<(), AppError> {
        let mini_rect = self.visible_rect(window)?;
        let pin_enabled = self.current_pin_enabled();

        if pin_enabled {
            if let Some(target) = self.league_client_window_target().await {
                self.move_window_to_visible_rect(
                    window,
                    Self::dock_to_target_right(target.rect, mini_rect),
                )?;
                self.mark_initialized()?;
                return Ok(());
            }
        }

        if !self.has_initialized_position()? {
            let target = self
                .league_client_window_target()
                .await
                .map(|target| target.rect)
                .or_else(|| self.main_window_visible_rect());

            if let Some(target) = target {
                self.move_window_to_visible_rect(
                    window,
                    Self::dock_to_target_right(target, mini_rect),
                )?;
            }

            self.mark_initialized()?;
        }

        Ok(())
    }

    async fn sync_follow_controller(&self) -> Result<(), AppError> {
        let Some(window) = self.mini_window() else {
            self.follow_controller.clear();
            return Ok(());
        };

        let is_minimized = window.is_minimized().map_err(|error| {
            AppError::other(format!(
                "failed to check mini window minimized state: {error}"
            ))
        })?;
        let is_visible = window.is_visible().map_err(|error| {
            AppError::other(format!("failed to check mini window visibility: {error}"))
        })?;

        if !is_visible || is_minimized || !self.current_pin_enabled() {
            self.follow_controller.clear();
            return Ok(());
        }

        let current = self.visible_rect(&window)?;
        let Some(target) = self.league_client_window_target().await else {
            self.follow_controller.clear();
            return Ok(());
        };

        self.move_window_to_visible_rect(
            &window,
            Self::dock_to_target_right(target.rect, current),
        )?;

        #[cfg(target_os = "windows")]
        {
            let mini_hwnd = self.mini_window_hwnd(&window)?;
            self.follow_controller
                .update_target(mini_hwnd, target.pid, target.rect);
        }

        Ok(())
    }

    fn handle_window_event(&self, event: &tauri::WindowEvent) {
        match event {
            tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_)
                if self.current_pin_enabled() =>
            {
                self.follow_controller.snap_to_last_target();
            }
            tauri::WindowEvent::Destroyed => {
                self.follow_controller.clear();
            }
            _ => {}
        }
    }

    pub async fn toggle(&self) -> Result<(), AppError> {
        let _lock = self.toggle_lock.lock().await;
        let window = self.ensure_window()?;
        let is_minimized = window.is_minimized().map_err(|error| {
            AppError::other(format!(
                "failed to check mini window minimized state: {error}"
            ))
        })?;
        let is_visible = window.is_visible().map_err(|error| {
            AppError::other(format!("failed to check mini window visibility: {error}"))
        })?;

        if is_minimized {
            window.unminimize().map_err(|error| {
                AppError::other(format!("failed to unminimize mini window: {error}"))
            })?;
            self.prepare_window_for_show(&window).await?;
            window
                .show()
                .map_err(|error| AppError::other(format!("failed to show mini window: {error}")))?;
            window.set_focus().map_err(|error| {
                AppError::other(format!("failed to focus mini window: {error}"))
            })?;
            self.try_apply_window_effect(&window);
            self.sync_follow_controller().await?;
        } else if is_visible {
            self.follow_controller.clear();
            window
                .hide()
                .map_err(|error| AppError::other(format!("failed to hide mini window: {error}")))?;
        } else {
            self.prepare_window_for_show(&window).await?;
            window
                .show()
                .map_err(|error| AppError::other(format!("failed to show mini window: {error}")))?;
            window.set_focus().map_err(|error| {
                AppError::other(format!("failed to focus mini window: {error}"))
            })?;
            self.try_apply_window_effect(&window);
            self.sync_follow_controller().await?;
        }

        Ok(())
    }
}

impl Default for MiniWindowShard {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl Shard for MiniWindowShard {
    shard_id!("b5dd6cf2-82b8-4a55-a080-e7e7e7e4b934");

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let host = jax.get_shard::<TauriHost>().clone();
        let window_effect = jax.get_shard::<WindowEffectShard>().clone();
        let settings = jax.get_shard::<SettingsShard>().clone();
        let lcu = jax.get_shard::<LcuShard>().clone();
        let lcu_manager = lcu.initialize(host.cancellation_token());
        let pin_setting = settings.register_definition(SettingDefinitionDto {
            id: MINI_PIN_SETTING_ID.to_string(),
            label_key: "settings.mini.pin.label".to_string(),
            hint_key: Some("settings.mini.pin.hint".to_string()),
            scope: SettingScopeDto::Shared,
            control: SettingControlDto::Toggle,
            default_value: Value::Bool(true),
            order: Some(10),
            visible: Some(true),
            options: None,
        })?;

        if self.host.set(host.clone()).is_err() {
            tracing::warn!("MiniWindowShard app handle was already initialized");
        }
        if self.window_effect.set(window_effect).is_err() {
            tracing::warn!("MiniWindowShard window effect shard was already initialized");
        }
        if self.lcu.set(lcu).is_err() {
            tracing::warn!("MiniWindowShard lcu shard was already initialized");
        }
        if self.lcu_manager.set(lcu_manager.clone()).is_err() {
            tracing::warn!("MiniWindowShard lcu manager was already initialized");
        }
        if self.pin_setting.set(pin_setting.clone()).is_err() {
            tracing::warn!("MiniWindowShard pin setting was already initialized");
        }

        let mini_window = self
            .ensure_window()
            .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { Box::new(error) })?;

        let shard_for_settings = jax.get_shard::<MiniWindowShard>().clone();
        pin_setting.spawn_watch(false, move |_value| {
            let shard = shard_for_settings.clone();
            async move {
                if let Err(error) = shard.sync_follow_controller().await {
                    tracing::warn!(error = %error, "Failed to refresh mini follow after pin setting change");
                }
            }
        })?;

        let shard_for_lcu = jax.get_shard::<MiniWindowShard>().clone();
        lcu_manager.subscribe_state_fn(move |_event| {
            let shard = shard_for_lcu.clone();
            async move {
                if let Err(error) = shard.sync_follow_controller().await {
                    tracing::warn!(error = %error, "Failed to refresh mini follow after LCU state change");
                }
            }
        });

        let shard_for_window_events = jax.get_shard::<MiniWindowShard>().clone();
        mini_window.on_window_event(move |event| {
            shard_for_window_events.handle_window_event(event);
        });

        Ok(())
    }

    fn dependencies(&self) -> Vec<uuid::Uuid> {
        depends![TauriHost, WindowEffectShard, SettingsShard, LcuShard]
    }
}

#[cfg(target_os = "windows")]
mod native_window {
    use std::mem::{size_of, zeroed};
    use std::ptr::null_mut;
    use std::sync::atomic::{AtomicBool, AtomicI32, AtomicIsize, AtomicU32, Ordering};
    use std::sync::{mpsc, Arc, Mutex, OnceLock};
    use std::thread::{self, JoinHandle};
    use std::time::Duration;

    use windows_sys::core::BOOL;
    use windows_sys::Win32::Foundation::{HWND, LPARAM, POINT, RECT};
    use windows_sys::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_EXTENDED_FRAME_BOUNDS};
    use windows_sys::Win32::Graphics::Gdi::ClientToScreen;
    use windows_sys::Win32::System::Threading::GetCurrentThreadId;
    use windows_sys::Win32::UI::Accessibility::{SetWinEventHook, UnhookWinEvent, HWINEVENTHOOK};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        DispatchMessageW, EnumWindows, GetClientRect, GetForegroundWindow, GetMessageW, GetWindow,
        GetWindowRect, GetWindowTextLengthW, GetWindowThreadProcessId, IsIconic, IsWindow,
        IsWindowVisible, PeekMessageW, PostThreadMessageW, SetWindowPos, TranslateMessage,
        CHILDID_SELF, EVENT_OBJECT_LOCATIONCHANGE, GW_OWNER, MSG, OBJID_WINDOW, PM_NOREMOVE,
        SWP_ASYNCWINDOWPOS, SWP_NOACTIVATE, SWP_NOSIZE, SWP_NOZORDER, WINEVENT_OUTOFCONTEXT,
        WINEVENT_SKIPOWNPROCESS, WM_APP,
    };

    use super::{Insets, Rect, MINI_WINDOW_GAP_PX};

    const FOLLOW_CONTROL_UPDATE: u32 = WM_APP + 0x051;
    const FOLLOW_CONTROL_EXIT: u32 = WM_APP + 0x052;

    static FOLLOW_SHARED: OnceLock<Arc<FollowShared>> = OnceLock::new();

    #[derive(Default)]
    struct WindowSearchState {
        pid: u32,
        fallback_hwnd: Option<HWND>,
        matched_hwnd: Option<HWND>,
    }

    #[derive(Default)]
    struct FollowShared {
        enabled: AtomicBool,
        mini_hwnd: AtomicIsize,
        target_pid: AtomicU32,
        thread_id: AtomicU32,
        last_target_x: AtomicI32,
        last_target_y: AtomicI32,
        last_target_width: AtomicI32,
        last_target_height: AtomicI32,
        has_last_target: AtomicBool,
    }

    impl FollowShared {
        fn store_last_target(&self, rect: Rect) {
            self.last_target_x.store(rect.x, Ordering::SeqCst);
            self.last_target_y.store(rect.y, Ordering::SeqCst);
            self.last_target_width.store(rect.width, Ordering::SeqCst);
            self.last_target_height.store(rect.height, Ordering::SeqCst);
            self.has_last_target.store(true, Ordering::SeqCst);
        }

        fn clear_last_target(&self) {
            self.has_last_target.store(false, Ordering::SeqCst);
        }

        fn last_target(&self) -> Option<Rect> {
            if !self.has_last_target.load(Ordering::SeqCst) {
                return None;
            }

            Some(Rect::new(
                self.last_target_x.load(Ordering::SeqCst),
                self.last_target_y.load(Ordering::SeqCst),
                self.last_target_width.load(Ordering::SeqCst),
                self.last_target_height.load(Ordering::SeqCst),
            ))
        }

        fn mini_hwnd(&self) -> Option<HWND> {
            let raw = self.mini_hwnd.load(Ordering::SeqCst);
            if raw == 0 {
                None
            } else {
                Some(raw as HWND)
            }
        }
    }

    pub struct FollowController {
        shared: Arc<FollowShared>,
        thread: Mutex<Option<JoinHandle<()>>>,
    }

    impl FollowController {
        pub fn new() -> Self {
            let shared = FOLLOW_SHARED
                .get_or_init(|| Arc::new(FollowShared::default()))
                .clone();
            let (ready_tx, ready_rx) = mpsc::channel();
            let thread_shared = shared.clone();
            let join_handle = thread::spawn(move || {
                run_follow_thread(thread_shared, ready_tx);
            });
            let thread_id = ready_rx
                .recv_timeout(Duration::from_secs(2))
                .unwrap_or_default();
            shared.thread_id.store(thread_id, Ordering::SeqCst);

            if thread_id == 0 {
                tracing::warn!("Mini window follow hook thread did not report a thread id");
            }

            Self {
                shared,
                thread: Mutex::new(Some(join_handle)),
            }
        }

        pub fn update_target(&self, mini_hwnd: isize, target_pid: u32, target_rect: Rect) {
            self.shared.enabled.store(true, Ordering::SeqCst);
            self.shared.mini_hwnd.store(mini_hwnd, Ordering::SeqCst);
            self.shared.target_pid.store(target_pid, Ordering::SeqCst);
            self.shared.store_last_target(target_rect);
            self.post(FOLLOW_CONTROL_UPDATE);
        }

        pub fn clear(&self) {
            self.shared.enabled.store(false, Ordering::SeqCst);
            self.shared.mini_hwnd.store(0, Ordering::SeqCst);
            self.shared.target_pid.store(0, Ordering::SeqCst);
            self.shared.clear_last_target();
            self.post(FOLLOW_CONTROL_UPDATE);
        }

        pub fn snap_to_last_target(&self) {
            self.post(FOLLOW_CONTROL_UPDATE);
        }

        fn post(&self, message: u32) {
            let thread_id = self.shared.thread_id.load(Ordering::SeqCst);
            if thread_id == 0 {
                return;
            }

            let posted = unsafe { PostThreadMessageW(thread_id, message, 0, 0) };
            if posted == 0 {
                tracing::debug!(message, "Failed to post mini follow control message");
            }
        }
    }

    impl Drop for FollowController {
        fn drop(&mut self) {
            self.post(FOLLOW_CONTROL_EXIT);

            if let Ok(mut guard) = self.thread.lock() {
                if let Some(handle) = guard.take() {
                    let _ = handle.join();
                }
            }
        }
    }

    fn is_candidate_window(hwnd: HWND, pid: u32) -> bool {
        if hwnd.is_null() {
            return false;
        }

        if unsafe { IsWindow(hwnd) } == 0
            || unsafe { IsWindowVisible(hwnd) } == 0
            || unsafe { IsIconic(hwnd) } != 0
            || !unsafe { GetWindow(hwnd, GW_OWNER) }.is_null()
        {
            return false;
        }

        let mut window_pid = 0u32;
        unsafe {
            GetWindowThreadProcessId(hwnd, &mut window_pid);
        }

        window_pid == pid
    }

    unsafe extern "system" fn enum_windows_cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let state = &mut *(lparam as *mut WindowSearchState);

        if !is_candidate_window(hwnd, state.pid) {
            return 1;
        }

        let title_len = GetWindowTextLengthW(hwnd);
        if title_len > 0 {
            state.matched_hwnd = Some(hwnd);
            return 0;
        }

        if state.fallback_hwnd.is_none() {
            state.fallback_hwnd = Some(hwnd);
        }

        1
    }

    fn best_window_for_pid(pid: u32) -> Option<HWND> {
        let foreground = unsafe { GetForegroundWindow() };
        if is_candidate_window(foreground, pid) {
            return Some(foreground);
        }

        let mut state = WindowSearchState {
            pid,
            ..WindowSearchState::default()
        };

        unsafe {
            EnumWindows(Some(enum_windows_cb), &mut state as *mut _ as isize);
        }

        state.matched_hwnd.or(state.fallback_hwnd)
    }

    fn window_bounds(hwnd: HWND) -> Option<Rect> {
        let mut rect: RECT = unsafe { zeroed() };
        let result = unsafe {
            DwmGetWindowAttribute(
                hwnd,
                DWMWA_EXTENDED_FRAME_BOUNDS as u32,
                &mut rect as *mut _ as *mut _,
                size_of::<RECT>() as u32,
            )
        };

        if result != 0 {
            let ok = unsafe { GetWindowRect(hwnd, &mut rect) };
            if ok == 0 {
                return None;
            }
        }

        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;

        if width <= 0 || height <= 0 {
            return None;
        }

        Some(Rect::new(rect.left, rect.top, width, height))
    }

    pub fn visible_rect_for_pid(pid: u32) -> Option<Rect> {
        best_window_for_pid(pid).and_then(window_bounds)
    }

    fn client_visible_rect(hwnd: HWND) -> Option<Rect> {
        let mut client_rect: RECT = unsafe { zeroed() };
        if unsafe { GetClientRect(hwnd, &mut client_rect) } == 0 {
            return None;
        }

        let mut origin = POINT {
            x: client_rect.left,
            y: client_rect.top,
        };
        if unsafe { ClientToScreen(hwnd, &mut origin) } == 0 {
            return None;
        }

        let width = client_rect.right - client_rect.left;
        let height = client_rect.bottom - client_rect.top;

        if width <= 0 || height <= 0 {
            return None;
        }

        Some(Rect::new(origin.x, origin.y, width, height))
    }

    fn frame_insets(hwnd: HWND) -> Option<Insets> {
        let mut outer_rect: RECT = unsafe { zeroed() };
        if unsafe { GetWindowRect(hwnd, &mut outer_rect) } == 0 {
            return None;
        }

        let client_rect = client_visible_rect(hwnd)?;
        Some(Insets {
            left: client_rect.x - outer_rect.left,
            top: client_rect.y - outer_rect.top,
        })
    }

    fn move_window_to_visible_rect(hwnd: HWND, target: Rect) -> bool {
        if let Some(current) = client_visible_rect(hwnd) {
            if current.approx_eq(&target) {
                return true;
            }
        }

        let Some(insets) = frame_insets(hwnd) else {
            return false;
        };

        let flags = SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_ASYNCWINDOWPOS;
        let result = unsafe {
            SetWindowPos(
                hwnd,
                null_mut(),
                target.x - insets.left,
                target.y - insets.top,
                0,
                0,
                flags,
            )
        };

        result != 0
    }

    fn snap_mini_to_target(shared: &FollowShared, target_rect: Rect) {
        shared.store_last_target(target_rect);

        let Some(mini_hwnd) = shared.mini_hwnd() else {
            return;
        };
        let Some(mini_rect) = client_visible_rect(mini_hwnd) else {
            return;
        };

        let docked = Rect::new(
            target_rect.right() + MINI_WINDOW_GAP_PX,
            target_rect.y,
            mini_rect.width,
            mini_rect.height,
        );

        let _ = move_window_to_visible_rect(mini_hwnd, docked);
    }

    unsafe extern "system" fn follow_event_callback(
        _hook: HWINEVENTHOOK,
        event: u32,
        hwnd: HWND,
        idobject: i32,
        idchild: i32,
        _event_thread: u32,
        _event_time: u32,
    ) {
        if event != EVENT_OBJECT_LOCATIONCHANGE
            || idobject != OBJID_WINDOW
            || idchild != CHILDID_SELF as i32
        {
            return;
        }

        let Some(shared) = FOLLOW_SHARED.get() else {
            return;
        };

        if !shared.enabled.load(Ordering::SeqCst) {
            return;
        }

        let target_pid = shared.target_pid.load(Ordering::SeqCst);
        if target_pid == 0 || !is_candidate_window(hwnd, target_pid) {
            return;
        }

        if let Some(bounds) = window_bounds(hwnd) {
            snap_mini_to_target(shared, bounds);
        }
    }

    fn sync_hook_registration(
        current_pid: &mut u32,
        hook: &mut HWINEVENTHOOK,
        shared: &FollowShared,
    ) {
        let desired_pid = if shared.enabled.load(Ordering::SeqCst) {
            shared.target_pid.load(Ordering::SeqCst)
        } else {
            0
        };

        if desired_pid == *current_pid {
            return;
        }

        if !hook.is_null() {
            unsafe {
                UnhookWinEvent(*hook);
            }
            *hook = null_mut();
            *current_pid = 0;
        }

        if desired_pid == 0 {
            return;
        }

        let next_hook = unsafe {
            SetWinEventHook(
                EVENT_OBJECT_LOCATIONCHANGE,
                EVENT_OBJECT_LOCATIONCHANGE,
                null_mut(),
                Some(follow_event_callback),
                desired_pid,
                0,
                WINEVENT_OUTOFCONTEXT | WINEVENT_SKIPOWNPROCESS,
            )
        };

        if next_hook.is_null() {
            tracing::warn!(
                target_pid = desired_pid,
                "Failed to install mini follow WinEvent hook"
            );
            return;
        }

        *hook = next_hook;
        *current_pid = desired_pid;
    }

    fn apply_cached_target(shared: &FollowShared) {
        let Some(target) = shared.last_target() else {
            return;
        };
        snap_mini_to_target(shared, target);
    }

    fn run_follow_thread(shared: Arc<FollowShared>, ready_tx: mpsc::Sender<u32>) {
        let thread_id = unsafe { GetCurrentThreadId() };

        unsafe {
            let mut msg: MSG = zeroed();
            PeekMessageW(&mut msg, null_mut(), 0, 0, PM_NOREMOVE);
        }

        let _ = ready_tx.send(thread_id);

        let mut current_pid = 0u32;
        let mut hook: HWINEVENTHOOK = null_mut();

        loop {
            let mut msg: MSG = unsafe { zeroed() };
            let result = unsafe { GetMessageW(&mut msg, null_mut(), 0, 0) };

            if result <= 0 {
                break;
            }

            match msg.message {
                FOLLOW_CONTROL_UPDATE => {
                    sync_hook_registration(&mut current_pid, &mut hook, &shared);
                    if shared.enabled.load(Ordering::SeqCst) {
                        apply_cached_target(&shared);
                    }
                }
                FOLLOW_CONTROL_EXIT => {
                    break;
                }
                _ => unsafe {
                    TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                },
            }
        }

        if !hook.is_null() {
            unsafe {
                UnhookWinEvent(hook);
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod native_window {
    use super::Rect;

    pub struct FollowController;

    impl FollowController {
        pub fn new() -> Self {
            Self
        }

        pub fn update_target(&self, _mini_hwnd: isize, _target_pid: u32, _target_rect: Rect) {}

        pub fn clear(&self) {}

        pub fn snap_to_last_target(&self) {}
    }

    pub fn visible_rect_for_pid(_pid: u32) -> Option<Rect> {
        None
    }
}
