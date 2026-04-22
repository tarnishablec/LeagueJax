use tauri::AppHandle;

use crate::error::AppError;

#[tauri::command]
pub async fn quit_application(app: AppHandle) -> Result<(), AppError> {
    app.exit(0);
    Ok(())
}
