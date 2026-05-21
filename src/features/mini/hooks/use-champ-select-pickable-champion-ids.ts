import { invoke } from "@tauri-apps/api/core";
import type { Accessor } from "solid-js";
import { createSolidQuery } from "@/infra/solid-query";

const PICKABLE_COMMAND = "lcu_get_pickable_champion_ids";

export function useSolidChampSelectPickableChampionIds(
  gameId: Accessor<number | null>,
  refreshKey: Accessor<number | null>,
) {
  return createSolidQuery<number[]>(
    () =>
      gameId() ? ([PICKABLE_COMMAND, gameId(), refreshKey()] as const) : null,
    (key) => {
      const [cmd] = key as readonly [string, number | null, number | null];
      return invoke<number[]>(cmd);
    },
    {
      keepPreviousData: true,
    },
  );
}
