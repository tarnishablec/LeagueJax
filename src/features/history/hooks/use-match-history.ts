import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { MatchSummary } from "@/bindings/matches.ts";

export function useMatchHistory(
  puuid: string | undefined,
  page = 0,
  pageSize = 20,
) {
  return useQuery<MatchSummary[]>({
    queryKey: ["match-history", puuid, page],
    queryFn: () =>
      invoke<MatchSummary[]>("get_match_history", {
        puuid,
        beginIndex: page * pageSize,
        endIndex: (page + 1) * pageSize,
      }),
    enabled: !!puuid,
  });
}
