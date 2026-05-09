use std::sync::{Arc, Mutex, OnceLock};

use async_trait::async_trait;
use euclid::{default::Point2D, default::Rect, default::Size2D};
use jax::{depends, shard_id, Jax, Shard};
use serde_json::Value;
use tauri::{Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tokio::sync::{Mutex as AsyncMutex, Notify};
use tokio::time::{sleep, timeout, Duration};

use crate::error::AppError;
use crate::shards::lcu::manager::{LcuManager, LcuManagerStateEvent};
use crate::shards::lcu::LcuShard;
use crate::shards::settings::types::{SettingControlDto, SettingDefinitionDto, SettingScopeDto};
use crate::shards::settings::{SettingHandle, SettingsShard};
use crate::shards::tauri_host::TauriHost;
use crate::shards::window_effect::WindowEffectShard;
use crate::utils::webview::apply_release_webview_hardening;

const MINI_WINDOW_LABEL: &str = "mini";
const MINI_WINDOW_TITLE: &str = "League Jax - Mini";
const MAIN_WINDOW_LABEL: &str = "main";
const MINI_AUTO_OPEN_SETTING_ID: &str = "mini.preference.autoOpen";
const MINI_PIN_SETTING_ID: &str = "mini.preference.pin";

const MINI_WINDOW_WIDTH: f64 = 380.0;
const MINI_WINDOW_HEIGHT: f64 = 680.0;
const MINI_WINDOW_MIN_WIDTH: f64 = 380.0;
const MINI_WINDOW_MIN_HEIGHT: f64 = 520.0;
const MINI_WINDOW_GAP_PX: i32 = 4;
const MINI_AUTO_OPEN_RETRY_ATTEMPTS: usize = 8;
const MINI_AUTO_OPEN_RETRY_INTERVAL: Duration = Duration::from_millis(250);
const MINI_READY_TIMEOUT: Duration = Duration::from_millis(1200);

type PxPoint = Point2D<i32>;
type PxSize = Size2D<i32>;
type PxRect = Rect<i32>;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
struct Insets {
    left: i32,
    top: i32,
}

#[derive(Clone, Copy, Debug)]
struct LeagueWindowTarget {
    pid: u32,
    rect: PxRect,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum InitState {
    Uninitialized,
    Positioned,
}

#[derive(Debug)]
struct MiniWindowState {
    init_state: InitState,
    ready: bool,
}

impl Default for MiniWindowState {
    fn default() -> Self {
        Self {
            init_state: InitState::Uninitialized,
            ready: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MiniWindowVisibilityState {
    Hidden,
    Visible,
    Minimized,
}

struct DockLayout;

impl DockLayout {
    fn dock_right_of(target: PxRect, mini_size: PxSize) -> PxRect {
        PxRect::new(
            PxPoint::new(target.max_x() + MINI_WINDOW_GAP_PX, target.min_y()),
            mini_size,
        )
    }

    fn approx_eq(a: PxRect, b: PxRect) -> bool {
        (a.origin.x - b.origin.x).abs() <= 1
            && (a.origin.y - b.origin.y).abs() <= 1
            && (a.size.width - b.size.width).abs() <= 1
            && (a.size.height - b.size.height).abs() <= 1
    }
}

pub struct MiniWindowShard {
    host: OnceLock<Arc<TauriHost>>,
    window_effect: OnceLock<Arc<WindowEffectShard>>,
    lcu: OnceLock<Arc<LcuShard>>,
    lcu_manager: OnceLock<Arc<LcuManager>>,
    auto_open_setting: OnceLock<SettingHandle>,
    pin_setting: OnceLock<SettingHandle>,
    self_ref: OnceLock<Arc<MiniWindowShard>>,

    state: Mutex<MiniWindowState>,
    toggle_lock: AsyncMutex<()>,
    ready_notify: Notify,

    follow_controller: native_window::FollowController,
}

impl MiniWindowShard {
    pub fn new() -> Self {
        Self {
            host: OnceLock::new(),
            window_effect: OnceLock::new(),
            lcu: OnceLock::new(),
            lcu_manager: OnceLock::new(),
            auto_open_setting: OnceLock::new(),
            pin_setting: OnceLock::new(),
            self_ref: OnceLock::new(),
            state: Mutex::new(MiniWindowState::default()),
            toggle_lock: AsyncMutex::new(()),
            ready_notify: Notify::new(),
            follow_controller: native_window::FollowController::new(),
        }
    }

    fn current_auto_open_enabled(&self) -> bool {
        self.auto_open_setting
            .get()
            .and_then(|handle| handle.get_value().ok())
            .and_then(|value| value.as_bool())
            .unwrap_or(true)
    }

    fn current_pin_enabled(&self) -> bool {
        self.pin_setting
            .get()
            .and_then(|handle| handle.get_value().ok())
            .and_then(|value| value.as_bool())
            .unwrap_or(true)
    }

    fn try_apply_window_effect(&self, window: &WebviewWindow) {
        if let Some(window_effect) = self.window_effect.get() {
            if let Err(error) = window_effect.apply_current_to_window(window) {
                tracing::warn!(error = %error, "Failed to apply window effect for mini window");
            }
        }
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
            WebviewUrl::App("mini.html".into()),
        )
        .title(MINI_WINDOW_TITLE)
        .inner_size(MINI_WINDOW_WIDTH, MINI_WINDOW_HEIGHT)
        .min_inner_size(MINI_WINDOW_MIN_WIDTH, MINI_WINDOW_MIN_HEIGHT)
        .decorations(false)
        .transparent(true)
        .resizable(true)
        .maximizable(false)
        .visible(false)
        .focused(false)
        .build()
        .map_err(|error| AppError::other(format!("failed to create mini window: {error}")))?;

        apply_release_webview_hardening(&window)
            .map_err(|error| AppError::other(format!("failed to harden mini webview: {error}")))?;
        self.try_apply_window_effect(&window);
        self.reset_window_state()?;
        if let Some(shard) = self.self_ref.get().cloned() {
            window.on_window_event(move |event| {
                shard.handle_window_event(event);
            });
        }
        Ok(window)
    }

    fn mini_window(&self) -> Option<WebviewWindow> {
        self.host
            .get()
            .and_then(|host| host.app.get_webview_window(MINI_WINDOW_LABEL))
    }

    #[cfg(target_os = "windows")]
    fn mini_window_hwnd_raw(&self, window: &WebviewWindow) -> Result<isize, AppError> {
        let hwnd = window
            .hwnd()
            .map_err(|error| AppError::other(format!("failed to read mini hwnd: {error}")))?;
        Ok(hwnd.0 as isize)
    }

    fn read_inner_rect(&self, window: &WebviewWindow) -> Result<PxRect, AppError> {
        let position = window
            .inner_position()
            .map_err(|error| AppError::other(format!("failed to read inner position: {error}")))?;

        let size = window
            .inner_size()
            .map_err(|error| AppError::other(format!("failed to read inner size: {error}")))?;

        let width = i32::try_from(size.width)
            .map_err(|_| AppError::other("window inner width exceeded i32 range"))?;
        let height = i32::try_from(size.height)
            .map_err(|_| AppError::other("window inner height exceeded i32 range"))?;

        Ok(PxRect::new(
            PxPoint::new(position.x, position.y),
            PxSize::new(width, height),
        ))
    }

    fn read_main_window_rect(&self) -> Option<PxRect> {
        let main_window = self
            .host
            .get()
            .and_then(|host| host.app.get_webview_window(MAIN_WINDOW_LABEL))?;

        self.read_inner_rect(&main_window).ok()
    }

    fn read_frame_insets(&self, window: &WebviewWindow) -> Result<Insets, AppError> {
        let outer = window
            .outer_position()
            .map_err(|error| AppError::other(format!("failed to read outer position: {error}")))?;
        let inner = window
            .inner_position()
            .map_err(|error| AppError::other(format!("failed to read inner position: {error}")))?;

        Ok(Insets {
            left: inner.x - outer.x,
            top: inner.y - outer.y,
        })
    }

    fn move_window_to_inner_rect(
        &self,
        window: &WebviewWindow,
        target: PxRect,
    ) -> Result<(), AppError> {
        if let Ok(current) = self.read_inner_rect(window) {
            if DockLayout::approx_eq(current, target) {
                return Ok(());
            }
        }

        let insets = self.read_frame_insets(window).unwrap_or_default();
        let outer_position =
            PhysicalPosition::new(target.origin.x - insets.left, target.origin.y - insets.top);

        window
            .set_position(outer_position)
            .map_err(|error| AppError::other(format!("failed to set window position: {error}")))?;

        Ok(())
    }

    fn read_init_state(&self) -> Result<InitState, AppError> {
        let guard = self.state.lock().map_err(|_| AppError::MutexPoisoned)?;
        Ok(guard.init_state)
    }

    fn mark_initialized(&self) -> Result<(), AppError> {
        let mut guard = self.state.lock().map_err(|_| AppError::MutexPoisoned)?;
        guard.init_state = InitState::Positioned;
        Ok(())
    }

    fn reset_window_state(&self) -> Result<(), AppError> {
        let mut guard = self.state.lock().map_err(|_| AppError::MutexPoisoned)?;
        guard.init_state = InitState::Uninitialized;
        guard.ready = false;
        Ok(())
    }

    fn mark_window_ready(&self) -> Result<(), AppError> {
        let mut guard = self.state.lock().map_err(|_| AppError::MutexPoisoned)?;
        guard.ready = true;
        self.ready_notify.notify_waiters();
        Ok(())
    }

    fn is_window_ready(&self) -> Result<bool, AppError> {
        let guard = self.state.lock().map_err(|_| AppError::MutexPoisoned)?;
        Ok(guard.ready)
    }

    async fn wait_for_window_ready(&self) -> Result<(), AppError> {
        if self.is_window_ready()? {
            return Ok(());
        }

        let _ = timeout(MINI_READY_TIMEOUT, self.ready_notify.notified()).await;
        Ok(())
    }

    fn classify_window_state(
        &self,
        window: &WebviewWindow,
    ) -> Result<MiniWindowVisibilityState, AppError> {
        let is_minimized = window.is_minimized().map_err(|error| {
            AppError::other(format!("failed to check minimized state: {error}"))
        })?;

        if is_minimized {
            return Ok(MiniWindowVisibilityState::Minimized);
        }

        let is_visible = window
            .is_visible()
            .map_err(|error| AppError::other(format!("failed to check visible state: {error}")))?;

        Ok(if is_visible {
            MiniWindowVisibilityState::Visible
        } else {
            MiniWindowVisibilityState::Hidden
        })
    }

    async fn focused_league_client_window_target(&self) -> Option<LeagueWindowTarget> {
        let manager = self.lcu_manager.get()?.clone();
        let focused_pid = manager.focused_pid().await?;
        native_window::visible_rect_for_pid(focused_pid).map(|rect| LeagueWindowTarget {
            pid: focused_pid,
            rect,
        })
    }

    async fn focused_league_client_window_target_with_retry(&self) -> Option<LeagueWindowTarget> {
        for attempt in 0..MINI_AUTO_OPEN_RETRY_ATTEMPTS {
            if let Some(target) = self.focused_league_client_window_target().await {
                return Some(target);
            }

            if attempt + 1 < MINI_AUTO_OPEN_RETRY_ATTEMPTS {
                sleep(MINI_AUTO_OPEN_RETRY_INTERVAL).await;
            }
        }

        None
    }

    async fn league_client_window_target(&self) -> Option<LeagueWindowTarget> {
        let manager = self.lcu_manager.get()?.clone();

        if let Some(focused_pid) = manager.focused_pid().await {
            if let Some(rect) = native_window::visible_rect_for_pid(focused_pid) {
                return Some(LeagueWindowTarget {
                    pid: focused_pid,
                    rect,
                });
            }
        }

        manager.any_ready_session().and_then(|session| {
            let pid = session.auth().pid;
            native_window::visible_rect_for_pid(pid).map(|rect| LeagueWindowTarget { pid, rect })
        })
    }

    async fn preferred_anchor_rect(&self) -> Option<PxRect> {
        self.league_client_window_target()
            .await
            .map(|target| target.rect)
            .or_else(|| self.read_main_window_rect())
    }

    async fn position_window_before_show(&self, window: &WebviewWindow) -> Result<(), AppError> {
        let mini_rect = self.read_inner_rect(window)?;
        let mini_size = mini_rect.size;

        if self.current_pin_enabled() {
            if let Some(target) = self.league_client_window_target().await {
                let docked = DockLayout::dock_right_of(target.rect, mini_size);
                self.move_window_to_inner_rect(window, docked)?;
                self.mark_initialized()?;
                return Ok(());
            }
        }

        if self.read_init_state()? == InitState::Uninitialized {
            if let Some(anchor) = self.preferred_anchor_rect().await {
                let docked = DockLayout::dock_right_of(anchor, mini_size);
                self.move_window_to_inner_rect(window, docked)?;
            }
            self.mark_initialized()?;
        }

        Ok(())
    }

    async fn show_window(&self, window: &WebviewWindow) -> Result<(), AppError> {
        self.position_window_before_show(window).await?;
        self.wait_for_window_ready().await?;

        window
            .show()
            .map_err(|error| AppError::other(format!("failed to show mini window: {error}")))?;

        window
            .set_focus()
            .map_err(|error| AppError::other(format!("failed to focus mini window: {error}")))?;

        self.try_apply_window_effect(window);
        self.sync_follow_controller().await?;

        Ok(())
    }

    async fn show_window_docked_to_target(
        &self,
        window: &WebviewWindow,
        target: LeagueWindowTarget,
    ) -> Result<(), AppError> {
        if self.classify_window_state(window)? == MiniWindowVisibilityState::Minimized {
            window.unminimize().map_err(|error| {
                AppError::other(format!("failed to unminimize mini window: {error}"))
            })?;
        }

        let mini_rect = self.read_inner_rect(window)?;
        let docked = DockLayout::dock_right_of(target.rect, mini_rect.size);
        self.move_window_to_inner_rect(window, docked)?;
        self.mark_initialized()?;
        self.wait_for_window_ready().await?;

        window
            .show()
            .map_err(|error| AppError::other(format!("failed to show mini window: {error}")))?;

        window
            .set_focus()
            .map_err(|error| AppError::other(format!("failed to focus mini window: {error}")))?;

        self.try_apply_window_effect(window);
        self.sync_follow_controller().await?;

        Ok(())
    }

    async fn auto_open_for_focused_client(&self) -> Result<(), AppError> {
        if !self.current_auto_open_enabled() {
            return Ok(());
        }

        let _lock = self.toggle_lock.lock().await;

        if !self.current_auto_open_enabled() {
            return Ok(());
        }

        let Some(target) = self.focused_league_client_window_target_with_retry().await else {
            return Ok(());
        };

        let window = self.ensure_window()?;
        self.show_window_docked_to_target(&window, target).await
    }

    async fn restore_minimized_window(&self, window: &WebviewWindow) -> Result<(), AppError> {
        window.unminimize().map_err(|error| {
            AppError::other(format!("failed to unminimize mini window: {error}"))
        })?;

        self.show_window(window).await
    }

    async fn hide_window(&self, window: &WebviewWindow) -> Result<(), AppError> {
        self.follow_controller.clear();

        window
            .close()
            .map_err(|error| AppError::other(format!("failed to close mini window: {error}")))?;

        Ok(())
    }

    async fn sync_follow_controller(&self) -> Result<(), AppError> {
        let Some(window) = self.mini_window() else {
            self.follow_controller.clear();
            return Ok(());
        };

        let state = self.classify_window_state(&window)?;
        if state != MiniWindowVisibilityState::Visible || !self.current_pin_enabled() {
            self.follow_controller.clear();
            return Ok(());
        }

        let current_rect = self.read_inner_rect(&window)?;

        let Some(target) = self.league_client_window_target().await else {
            self.follow_controller.clear();
            return Ok(());
        };

        let docked = DockLayout::dock_right_of(target.rect, current_rect.size);
        self.move_window_to_inner_rect(&window, docked)?;

        #[cfg(target_os = "windows")]
        {
            let mini_hwnd_raw = self.mini_window_hwnd_raw(&window)?;
            self.follow_controller.update_target(
                mini_hwnd_raw,
                target.pid,
                target.rect,
                current_rect.size,
            );
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
                if let Err(error) = self.reset_window_state() {
                    tracing::warn!(error = %error, "Failed to reset mini window state");
                }
            }
            _ => {}
        }
    }

    pub async fn toggle(&self) -> Result<(), AppError> {
        let _lock = self.toggle_lock.lock().await;

        let window = self.ensure_window()?;

        match self.classify_window_state(&window)? {
            MiniWindowVisibilityState::Minimized => {
                self.restore_minimized_window(&window).await?;
            }
            MiniWindowVisibilityState::Visible => {
                self.hide_window(&window).await?;
            }
            MiniWindowVisibilityState::Hidden => {
                self.show_window(&window).await?;
            }
        }

        Ok(())
    }

    pub async fn set_pin_value(&self, value: Value) -> Result<(), AppError> {
        let handle = self
            .pin_setting
            .get()
            .ok_or_else(|| AppError::other("mini pin setting is not initialized"))?;

        handle.set_value(value)?;
        self.sync_follow_controller().await
    }

    pub fn ready(&self) -> Result<(), AppError> {
        self.mark_window_ready()
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
    depends![TauriHost, WindowEffectShard, SettingsShard, LcuShard];

    async fn setup(&self, jax: Arc<Jax>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let host = jax.get_shard::<TauriHost>().clone();
        let window_effect = jax.get_shard::<WindowEffectShard>().clone();
        let settings = jax.get_shard::<SettingsShard>().clone();
        let lcu = jax.get_shard::<LcuShard>().clone();
        let lcu_manager = lcu.initialize(host.cancellation_token())?;

        let auto_open_setting = settings.register_definition(SettingDefinitionDto {
            id: MINI_AUTO_OPEN_SETTING_ID.to_string(),
            label_key: "settings.mini.autoOpen.label".to_string(),
            hint_key: Some("settings.mini.autoOpen.hint".to_string()),
            scope: SettingScopeDto::Shared,
            control: Some(SettingControlDto::Toggle),
            default_value: Value::Bool(true),
            order: Some(5),
            visible: Some(true),
            options: None,
        })?;

        let pin_setting = settings.register_definition(SettingDefinitionDto {
            id: MINI_PIN_SETTING_ID.to_string(),
            label_key: "settings.mini.pin.label".to_string(),
            hint_key: Some("settings.mini.pin.hint".to_string()),
            scope: SettingScopeDto::Shared,
            control: Some(SettingControlDto::Toggle),
            default_value: Value::Bool(true),
            order: Some(10),
            visible: Some(true),
            options: None,
        })?;

        if self.host.set(host.clone()).is_err() {
            tracing::warn!("MiniWindowShard host already initialized");
        }
        if self.window_effect.set(window_effect).is_err() {
            tracing::warn!("MiniWindowShard window_effect already initialized");
        }
        if self.lcu.set(lcu).is_err() {
            tracing::warn!("MiniWindowShard lcu already initialized");
        }
        if self.lcu_manager.set(lcu_manager.clone()).is_err() {
            tracing::warn!("MiniWindowShard lcu_manager already initialized");
        }
        if self
            .auto_open_setting
            .set(auto_open_setting.clone())
            .is_err()
        {
            tracing::warn!("MiniWindowShard auto_open_setting already initialized");
        }
        if self.pin_setting.set(pin_setting.clone()).is_err() {
            tracing::warn!("MiniWindowShard pin_setting already initialized");
        }
        if self
            .self_ref
            .set(jax.get_shard::<MiniWindowShard>().clone())
            .is_err()
        {
            tracing::warn!("MiniWindowShard self_ref already initialized");
        }

        let shard_for_auto_open_setting = jax.get_shard::<MiniWindowShard>().clone();
        auto_open_setting.spawn_watch(false, move |value| {
            let shard = shard_for_auto_open_setting.clone();
            async move {
                if !value.as_bool().unwrap_or(false) {
                    return;
                }

                if let Err(error) = shard.auto_open_for_focused_client().await {
                    tracing::warn!(error = %error, "Failed to auto-open mini window after setting change");
                }
            }
        })?;

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
        lcu_manager.subscribe_state_fn(move |event| {
            let shard = shard_for_lcu.clone();
            async move {
                if matches!(
                    &event,
                    LcuManagerStateEvent::FocusChanged(change) if change.current.is_some()
                ) {
                    if let Err(error) = shard.auto_open_for_focused_client().await {
                        tracing::warn!(error = %error, "Failed to auto-open mini window after LCU focus change");
                    }
                }

                if let Err(error) = shard.sync_follow_controller().await {
                    tracing::warn!(error = %error, "Failed to refresh mini follow after LCU state change");
                }
            }
        });
        Ok(())
    }
}

#[cfg(target_os = "windows")]
mod native_window {
    use super::{DockLayout, Insets, PxPoint, PxRect, PxSize};

    use std::mem::{size_of, zeroed};
    use std::ptr::null_mut;
    use std::sync::atomic::{AtomicBool, AtomicI32, AtomicIsize, AtomicU32, Ordering};
    use std::sync::{Arc, Mutex, OnceLock};
    use std::thread::{self, JoinHandle};

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
        SWP_NOACTIVATE, SWP_NOSIZE, SWP_NOZORDER, WINEVENT_OUTOFCONTEXT, WINEVENT_SKIPOWNPROCESS,
        WM_APP,
    };

    const FOLLOW_CONTROL_UPDATE: u32 = WM_APP + 0x051;
    const FOLLOW_CONTROL_EXIT: u32 = WM_APP + 0x052;
    const FOLLOW_NATIVE_MOVED: u32 = WM_APP + 0x053;

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

        mini_width: AtomicI32,
        mini_height: AtomicI32,
        has_mini_size: AtomicBool,

        pending_target_x: AtomicI32,
        pending_target_y: AtomicI32,
        pending_target_width: AtomicI32,
        pending_target_height: AtomicI32,
        has_pending_target: AtomicBool,

        move_pending: AtomicBool,
    }

    impl FollowShared {
        fn store_last_target(&self, rect: PxRect) {
            self.last_target_x.store(rect.origin.x, Ordering::SeqCst);
            self.last_target_y.store(rect.origin.y, Ordering::SeqCst);
            self.last_target_width
                .store(rect.size.width, Ordering::SeqCst);
            self.last_target_height
                .store(rect.size.height, Ordering::SeqCst);
            self.has_last_target.store(true, Ordering::SeqCst);
        }

        fn clear_last_target(&self) {
            self.has_last_target.store(false, Ordering::SeqCst);
        }

        fn last_target(&self) -> Option<PxRect> {
            if !self.has_last_target.load(Ordering::SeqCst) {
                return None;
            }

            Some(PxRect::new(
                PxPoint::new(
                    self.last_target_x.load(Ordering::SeqCst),
                    self.last_target_y.load(Ordering::SeqCst),
                ),
                PxSize::new(
                    self.last_target_width.load(Ordering::SeqCst),
                    self.last_target_height.load(Ordering::SeqCst),
                ),
            ))
        }

        fn store_mini_size(&self, size: PxSize) {
            self.mini_width.store(size.width, Ordering::SeqCst);
            self.mini_height.store(size.height, Ordering::SeqCst);
            self.has_mini_size.store(true, Ordering::SeqCst);
        }

        fn clear_mini_size(&self) {
            self.has_mini_size.store(false, Ordering::SeqCst);
        }

        fn mini_size(&self) -> Option<PxSize> {
            if !self.has_mini_size.load(Ordering::SeqCst) {
                return None;
            }

            Some(PxSize::new(
                self.mini_width.load(Ordering::SeqCst),
                self.mini_height.load(Ordering::SeqCst),
            ))
        }

        fn store_pending_target(&self, rect: PxRect) {
            self.pending_target_x.store(rect.origin.x, Ordering::SeqCst);
            self.pending_target_y.store(rect.origin.y, Ordering::SeqCst);
            self.pending_target_width
                .store(rect.size.width, Ordering::SeqCst);
            self.pending_target_height
                .store(rect.size.height, Ordering::SeqCst);
            self.has_pending_target.store(true, Ordering::SeqCst);
        }

        fn take_pending_target(&self) -> Option<PxRect> {
            if !self.has_pending_target.load(Ordering::SeqCst) {
                return None;
            }

            let rect = PxRect::new(
                PxPoint::new(
                    self.pending_target_x.load(Ordering::SeqCst),
                    self.pending_target_y.load(Ordering::SeqCst),
                ),
                PxSize::new(
                    self.pending_target_width.load(Ordering::SeqCst),
                    self.pending_target_height.load(Ordering::SeqCst),
                ),
            );

            self.has_pending_target.store(false, Ordering::SeqCst);
            Some(rect)
        }

        fn clear_pending_target(&self) {
            self.has_pending_target.store(false, Ordering::SeqCst);
            self.move_pending.store(false, Ordering::SeqCst);
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

            let thread_shared = shared.clone();
            let join_handle = thread::spawn(move || {
                run_follow_thread(thread_shared);
            });

            Self {
                shared,
                thread: Mutex::new(Some(join_handle)),
            }
        }

        pub fn update_target(
            &self,
            mini_hwnd_raw: isize,
            target_pid: u32,
            target_rect: PxRect,
            mini_size: PxSize,
        ) {
            self.shared.enabled.store(true, Ordering::SeqCst);
            self.shared.mini_hwnd.store(mini_hwnd_raw, Ordering::SeqCst);
            self.shared.target_pid.store(target_pid, Ordering::SeqCst);
            self.shared.store_last_target(target_rect);
            self.shared.store_pending_target(target_rect);
            self.shared.store_mini_size(mini_size);
            self.post(FOLLOW_CONTROL_UPDATE);
        }

        pub fn clear(&self) {
            self.shared.enabled.store(false, Ordering::SeqCst);
            self.shared.mini_hwnd.store(0, Ordering::SeqCst);
            self.shared.target_pid.store(0, Ordering::SeqCst);
            self.shared.clear_last_target();
            self.shared.clear_mini_size();
            self.shared.clear_pending_target();
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
                tracing::debug!(message, "Failed to post follow control message");
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

    fn window_bounds(hwnd: HWND) -> Option<PxRect> {
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

        Some(PxRect::new(
            PxPoint::new(rect.left, rect.top),
            PxSize::new(width, height),
        ))
    }

    pub fn visible_rect_for_pid(pid: u32) -> Option<PxRect> {
        best_window_for_pid(pid).and_then(window_bounds)
    }

    fn client_visible_rect(hwnd: HWND) -> Option<PxRect> {
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

        Some(PxRect::new(
            PxPoint::new(origin.x, origin.y),
            PxSize::new(width, height),
        ))
    }

    fn frame_insets(hwnd: HWND) -> Option<Insets> {
        let mut outer_rect: RECT = unsafe { zeroed() };
        if unsafe { GetWindowRect(hwnd, &mut outer_rect) } == 0 {
            return None;
        }

        let client_rect = client_visible_rect(hwnd)?;
        Some(Insets {
            left: client_rect.origin.x - outer_rect.left,
            top: client_rect.origin.y - outer_rect.top,
        })
    }

    fn move_window_to_inner_rect(hwnd: HWND, target: PxRect) -> bool {
        if let Some(current) = client_visible_rect(hwnd) {
            if DockLayout::approx_eq(current, target) {
                return true;
            }
        }

        let Some(insets) = frame_insets(hwnd) else {
            return false;
        };

        let result = unsafe {
            SetWindowPos(
                hwnd,
                null_mut(),
                target.origin.x - insets.left,
                target.origin.y - insets.top,
                0,
                0,
                SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
            )
        };

        result != 0
    }

    fn snap_mini_to_target(shared: &FollowShared, target_rect: PxRect) {
        shared.store_last_target(target_rect);

        let Some(mini_hwnd) = shared.mini_hwnd() else {
            return;
        };

        let Some(mini_size) = shared.mini_size() else {
            return;
        };

        let docked = DockLayout::dock_right_of(target_rect, mini_size);
        let _ = move_window_to_inner_rect(mini_hwnd, docked);
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

        let Some(bounds) = window_bounds(hwnd) else {
            return;
        };

        shared.store_pending_target(bounds);

        let thread_id = shared.thread_id.load(Ordering::SeqCst);
        if thread_id == 0 {
            return;
        }

        if !shared.move_pending.swap(true, Ordering::SeqCst) {
            let _ = PostThreadMessageW(thread_id, FOLLOW_NATIVE_MOVED, 0, 0);
        }
    }

    fn sync_hook_registration(
        current_pid: &mut u32,
        hook: &mut Option<HWINEVENTHOOK>,
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

        if let Some(existing) = hook.take() {
            unsafe {
                UnhookWinEvent(existing);
            }
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

        *hook = Some(next_hook);
        *current_pid = desired_pid;
    }

    fn apply_cached_target(shared: &FollowShared) {
        let Some(target) = shared.last_target() else {
            return;
        };
        snap_mini_to_target(shared, target);
    }

    fn apply_latest_pending_target(shared: &FollowShared) {
        let Some(target) = shared.take_pending_target() else {
            return;
        };
        snap_mini_to_target(shared, target);
    }

    fn run_follow_thread(shared: Arc<FollowShared>) {
        let thread_id = unsafe { GetCurrentThreadId() };

        unsafe {
            let mut msg: MSG = zeroed();
            PeekMessageW(&mut msg, null_mut(), 0, 0, PM_NOREMOVE);
        }

        shared.thread_id.store(thread_id, Ordering::SeqCst);

        let mut current_pid = 0u32;
        let mut hook: Option<HWINEVENTHOOK> = None;

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
                FOLLOW_NATIVE_MOVED => {
                    shared.move_pending.store(false, Ordering::SeqCst);

                    if shared.enabled.load(Ordering::SeqCst) {
                        apply_latest_pending_target(&shared);

                        if shared.has_pending_target.load(Ordering::SeqCst)
                            && !shared.move_pending.swap(true, Ordering::SeqCst)
                        {
                            let _ = unsafe {
                                PostThreadMessageW(
                                    shared.thread_id.load(Ordering::SeqCst),
                                    FOLLOW_NATIVE_MOVED,
                                    0,
                                    0,
                                )
                            };
                        }
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

        if let Some(existing) = hook.take() {
            unsafe {
                UnhookWinEvent(existing);
            }
        }

        shared.thread_id.store(0, Ordering::SeqCst);
        shared.move_pending.store(false, Ordering::SeqCst);
    }
}

#[cfg(not(target_os = "windows"))]
mod native_window {
    use super::{PxRect, PxSize};

    pub struct FollowController;

    impl FollowController {
        pub fn new() -> Self {
            Self
        }

        pub fn update_target(
            &self,
            _mini_hwnd_raw: isize,
            _target_pid: u32,
            _target_rect: PxRect,
            _mini_size: PxSize,
        ) {
        }

        pub fn clear(&self) {}

        pub fn snap_to_last_target(&self) {}
    }

    pub fn visible_rect_for_pid(_pid: u32) -> Option<PxRect> {
        None
    }
}
