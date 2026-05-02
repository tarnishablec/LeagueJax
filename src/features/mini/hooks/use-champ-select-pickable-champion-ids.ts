import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";

const PICKABLE_COMMAND = "lcu_get_pickable_champion_ids";

export function useChampSelectPickableChampionIds(gameId: number | null) {
  return useSWR(
    gameId ? [PICKABLE_COMMAND, gameId] : null,
    ([cmd]) => invoke<number[]>(cmd),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
}
