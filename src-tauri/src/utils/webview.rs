use tauri::WebviewWindow;

pub fn apply_release_webview_hardening(window: &WebviewWindow) -> tauri::Result<()> {
    apply_release_webview_hardening_impl(window)
}

#[cfg(all(target_os = "windows", not(debug_assertions)))]
fn apply_release_webview_hardening_impl(window: &WebviewWindow) -> tauri::Result<()> {
    window.with_webview(|webview| unsafe {
        let controller = webview.controller();

        if let Ok(core) = controller.CoreWebView2() {
            if let Ok(settings) = core.Settings() {
                let _ = settings.SetAreDevToolsEnabled(false);
                let _ = settings.SetAreDefaultContextMenusEnabled(false);
            }
        }
    })
}

#[cfg(not(all(target_os = "windows", not(debug_assertions))))]
fn apply_release_webview_hardening_impl(_window: &WebviewWindow) -> tauri::Result<()> {
    Ok(())
}
