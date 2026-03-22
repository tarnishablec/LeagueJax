import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { RankStats } from "@/bindings/rank";

export function useRankedSummary(puuid: string | undefined) {
  return useSWR(
    puuid ? ["get_ranked_summary", puuid] : null,
    ([cmd, resolvedPuuid]) =>
      invoke<RankStats>(cmd, {
        puuid: resolvedPuuid,
      }),
    {
      dedupingInterval: 30_000,
    },
  );
}
