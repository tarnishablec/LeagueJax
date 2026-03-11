import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { MatchDetail } from "../types";

export function useMatchDetail(gameId: number | null) {
  return useQuery<MatchDetail>({
    queryKey: ["match-detail", gameId],
    queryFn: () => invoke<MatchDetail>("get_match_detail", { gameId }),
    enabled: gameId !== null,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
