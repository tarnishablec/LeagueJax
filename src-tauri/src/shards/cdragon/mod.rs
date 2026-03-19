use crate::error::AppError;
use crate::shards::lcu::api::LcuApi;

fn normalize_tier(tier: &str) -> String {
    let normalized = tier.trim().to_ascii_lowercase();
    if normalized.is_empty() {
        "unranked".to_string()
    } else {
        normalized
    }
}

pub fn rank_icon_paths(tier: &str) -> Vec<String> {
    let tier = normalize_tier(tier);

    vec![
        format!("/lol-game-data/assets/v1/ranked-mini-crests/{tier}.png"),
        format!("/lol-game-data/assets/v1/ranked-mini-crests/{tier}.svg"),
        format!("/lol-game-data/assets/v1/ranked-emblems/{tier}.png"),
        format!("/lol-game-data/assets/v1/ranked-emblems/{tier}.svg"),
        format!("/lol-game-data/assets/v1/ranked-emblems/emblem-{tier}.png"),
        format!("/lol-game-data/assets/v1/ranked-emblems/emblem-{tier}.svg"),
        format!("/lol-game-data/assets/v1/ranked-emblem/{tier}.png"),
        format!("/lol-game-data/assets/v1/ranked-emblem/{tier}.svg"),
        format!("/lol-game-data/assets/v1/ranked-emblem/emblem-{tier}.png"),
        format!("/lol-game-data/assets/v1/ranked-emblem/emblem-{tier}.svg"),
    ]
}

pub async fn fetch_rank_icon_bytes(client: &LcuApi, tier: &str) -> Result<Vec<u8>, AppError> {
    for path in rank_icon_paths(tier) {
        if let Ok(bytes) = client.get_bytes_strict(&path).await {
            return Ok(bytes);
        }
    }

    Err(AppError::Other(format!(
        "Rank icon not found in CDragon assets for tier {tier}"
    )))
}
