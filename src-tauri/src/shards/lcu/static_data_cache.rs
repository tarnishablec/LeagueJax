use crate::error::AppError;
use crate::shards::lcu::session::LcuSession;

pub(crate) const LCU_CHERRY_AUGMENTS_CACHE_FILE: &str = "cherry-augments.json";

pub(crate) async fn lcu_static_data_cache_namespace(lcu: &LcuSession) -> Result<String, AppError> {
    let api = lcu.api();
    let version = lcu
        .cache()
        .get_or_try_init("game_version", || api.get_game_version())
        .await?;
    let locale = match lcu
        .cache()
        .get_or_try_init("region_locale", || api.get_region_locale())
        .await
    {
        Ok(region_locale) => region_locale.locale,
        Err(error) => {
            tracing::warn!(
                error = %error,
                "Failed to read LCU region-locale; using cache namespace fallback"
            );
            String::new()
        }
    };

    Ok(format!(
        "{}__{}",
        normalize_namespace_part(&version),
        normalize_namespace_part(&locale)
    ))
}

fn normalize_namespace_part(value: &str) -> String {
    let normalized = value.trim();
    if normalized.is_empty() {
        "unknown".to_string()
    } else {
        normalized.to_string()
    }
}
