import type { Accessor } from "solid-js";
import { createMemo } from "solid-js";
import { selectIsFocused, useSolidLcuStore } from "@/stores/lcu";

const CDRAGON_GAME_DATA_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";

export function useSolidChampionIcon(
  championId: Accessor<number | null | undefined>,
) {
  const connected = useSolidLcuStore(selectIsFocused);

  return createMemo(() => {
    const id = championId();
    if (!connected() || !id) {
      return null;
    }

    return `${CDRAGON_GAME_DATA_BASE}/v1/champion-icons/${id}.png`;
  });
}
