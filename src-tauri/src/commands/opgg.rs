use std::sync::Arc;

use jax::Jax;
use tauri::State;

use crate::error::AppError;
use crate::shards::network::NetworkShard;
use crate::shards::opgg::{
    champion_detail, list_champions, OpggChampionDetailDto, OpggChampionListDto, OpggFiltersDto,
    OpggShard,
};

#[tauri::command]
pub async fn opgg_list_champions(
    jax: State<'_, Arc<Jax>>,
    filters: Option<OpggFiltersDto>,
) -> Result<OpggChampionListDto, AppError> {
    let network = jax.get_shard::<NetworkShard>().config()?;
    list_champions(
        network.external_http_client(),
        network.request_timeout(),
        filters.unwrap_or_default(),
    )
    .await
}

#[tauri::command]
pub async fn opgg_get_champion_detail(
    jax: State<'_, Arc<Jax>>,
    champion_id: u32,
    position: String,
    filters: Option<OpggFiltersDto>,
    counter_column_limit: Option<usize>,
) -> Result<OpggChampionDetailDto, AppError> {
    let network = jax.get_shard::<NetworkShard>().config()?;
    let counter_column_limit = jax
        .get_shard::<OpggShard>()
        .counter_column_limit(counter_column_limit)?;
    champion_detail(
        network.external_http_client(),
        network.request_timeout(),
        champion_id,
        &position,
        filters.unwrap_or_default(),
        counter_column_limit,
    )
    .await
}
