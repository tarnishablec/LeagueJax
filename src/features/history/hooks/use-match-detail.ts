import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { MatchDetail } from "@/bindings/matches.ts";

export function useMatchDetail(gameId: number | null) {
  return useSWR(
    gameId ? ["get_match_detail", gameId] : null,
    () => invoke<MatchDetail>("get_match_detail", { gameId }),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );
}
