import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { RankedSummary } from "@/bindings/summoner.ts";

export function useRankedSummary(puuid: string | undefined) {
  return useSWR(
    puuid ? ["get_ranked_summary", puuid] : null,
    ([cmd, resolvedPuuid]) =>
      invoke<RankedSummary>(cmd, {
        puuid: resolvedPuuid,
      }),
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
    },
  );
}
