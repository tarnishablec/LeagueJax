import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { RawMatchSummaryGame } from "@/bindings/matches.ts";

export function useMatchSummary(
  gameId: number | null,
  sgpServerId: string | null,
) {
  return useSWR(
    gameId ? ["get_match_summary", gameId, sgpServerId] : null,
    () =>
      invoke<RawMatchSummaryGame>("get_match_summary", {
        gameId,
        ...(sgpServerId ? { sgpServerId } : {}),
      }),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );
}
