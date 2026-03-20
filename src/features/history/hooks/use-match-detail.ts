import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { MatchDetail } from "@/bindings/matches.ts";

export function useMatchDetail(
  gameId: number | null,
  sgpServerId: string | null,
) {
  return useSWR(
    gameId ? ["get_match_detail", gameId, sgpServerId] : null,
    () =>
      invoke<MatchDetail>("get_match_detail", {
        gameId,
        ...(sgpServerId ? { sgpServerId } : {}),
      }),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );
}
