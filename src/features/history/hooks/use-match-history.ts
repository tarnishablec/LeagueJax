import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { MatchSummary } from "@/bindings/matches.ts";

export function useMatchHistory(
  puuid: string | undefined,
  page = 0,
  pageSize = 20,
) {
  return useSWR(
    puuid && page > 0 ? ["get_match_history", puuid, page] : null,
    ([cmd]) =>
      invoke<MatchSummary[]>(cmd, {
        puuid,
        beginIndex: page * pageSize,
        endIndex: (page + 1) * pageSize,
      }),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );
}
