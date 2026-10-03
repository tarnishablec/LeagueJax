// Wait for both datasets even if one fails, so the loading button stays busy
// until every request settles. Each query retains its own error for presentation.
export async function refreshChampionData(
  refreshList: () => Promise<unknown>,
  refreshDetail: () => Promise<unknown>,
): Promise<void> {
  await Promise.allSettled([refreshList(), refreshDetail()]);
}
