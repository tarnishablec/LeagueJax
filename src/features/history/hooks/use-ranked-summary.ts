import { invoke } from "@tauri-apps/api/core";
import type { Accessor } from "solid-js";
import type { RankStats } from "@/bindings/rank";
import { createSolidQuery } from "@/infra/solid-query";

type RankedSummaryKey = readonly ["get_ranked_summary", string];

export function useSolidRankedSummary(puuid: Accessor<string | undefined>) {
  return createSolidQuery<RankStats>(
    () => {
      const resolvedPuuid = puuid();
      return resolvedPuuid
        ? (["get_ranked_summary", resolvedPuuid] as const)
        : null;
    },
    (key) => {
      const [cmd, resolvedPuuid] = key as RankedSummaryKey;
      return invoke<RankStats>(cmd, {
        puuid: resolvedPuuid,
      });
    },
    { keepPreviousData: true },
  );
}
