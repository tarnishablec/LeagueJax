import { selectIsFocused, useLcuStore } from "@/stores/lcu";

const CDRAGON_GAME_DATA_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";

export function useChampionIcon(championId: number | null | undefined) {
  const connected = useLcuStore(selectIsFocused);

  if (!connected || !championId) {
    return null;
  }

  return `${CDRAGON_GAME_DATA_BASE}/v1/champion-icons/${championId}.png`;
}
