// Prevents an additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    #[cfg(windows)]
    {
        unsafe {
            windows::Win32::System::Console::SetConsoleOutputCP(65001)
                .expect("TODO: panic message");
        }
    }

    league_jax_lib::run()
}
