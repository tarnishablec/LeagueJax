import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import useSWR from "swr";
import type { LcuMap } from "@/bindings/maps";
import { selectIsFocused, useLcuStore } from "@/stores/lcu.ts";

export function useLcuMaps() {
  const connected = useLcuStore(selectIsFocused);

  return useSWR(
    connected ? ["lcu_get_maps"] : null,
    ([cmd]) => invoke<LcuMap[]>(cmd),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );
}

export function useLcuMapQuery(
  mapId: number,
  gameMutators: string[],
  gameMode: string,
) {
  const { data: maps } = useLcuMaps();

  const data = useMemo(() => {
    if (!maps) {
      return undefined;
    }

    const exactModeMatch = maps.find(
      (map) => map.id === mapId && map.gameMode === gameMode,
    );
    if (exactModeMatch) {
      return exactModeMatch;
    }

    const normalizedMutators = gameMutators
      .map((mutator) => mutator.trim().toUpperCase())
      .filter((mutator) => mutator.length > 0);
    if (normalizedMutators.length > 0) {
      const mutatorMatch = maps.find(
        (map) =>
          map.id === mapId &&
          normalizedMutators.includes(map.gameMutator.trim().toUpperCase()),
      );
      if (mutatorMatch) {
        return mutatorMatch;
      }
    }

    return maps.find((map) => map.id === mapId);
  }, [maps, mapId, gameMode, gameMutators]);

  return { data };
}
