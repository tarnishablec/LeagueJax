fn main() {
    // Ensure the build script runs on every build (needed for kill_running_instance)
    println!("cargo:rerun-if-changed=FORCE_RERUN");

    #[cfg(target_os = "windows")]
    kill_running_instance();

    tauri_build::build()
}

#[cfg(target_os = "windows")]
fn kill_running_instance() {
    let _ = std::process::Command::new("taskkill")
        .args(["/F", "/IM", "league-jax.exe"])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();

    // Give Windows time to release the file handle
    std::thread::sleep(std::time::Duration::from_millis(300));
}
