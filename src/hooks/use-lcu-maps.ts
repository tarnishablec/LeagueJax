import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { LcuMap } from "@/bindings/maps";
import { selectIsFocused, useLcuStore } from "@/stores/lcu.ts";

export function useLcuMaps() {
  const connected = useLcuStore(selectIsFocused);

  return useSWR(connected ? ["get_lcu_maps"] : null, invoke<LcuMap[]>, {
    dedupingInterval: Number.POSITIVE_INFINITY,
  });
}

export function useLcuMapQuery(
  mapId: number,
  gameMutators: string[],
  gameMode: string,
) {
  const { data: maps } = useLcuMaps();

  return useSWR(
    ["get_lcu_map_query", mapId, gameMutators, gameMode],
    () => {
      return maps?.find((map) => map.id === mapId && map.gameMode === gameMode);
    },
    { dedupingInterval: Number.POSITIVE_INFINITY },
  );
}
