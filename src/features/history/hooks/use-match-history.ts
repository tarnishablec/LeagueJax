import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type {
  RawMatchSummariesResponse,
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import type { MatchModeTag } from "../types/match-mode";

export type EnrichedMatch = RawMatchSummaryGame & {
  me: RawMatchSummaryParticipant;
};

function modeTagToQueryTag(tag: MatchModeTag): string | undefined {
  return tag === "all" ? undefined : tag;
}

export function useMatchHistory(
  puuid: string | undefined,
  sgpServerId: string | null,
  page: number,
  pageSize = 20,
  modeTag: MatchModeTag = "all",
  autoRefreshOnSwitch = false,
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    puuid
      ? ["get_match_summaries", puuid, sgpServerId, page, pageSize, modeTag]
      : null,
    async ([
      cmd,
      resolvedPuuid,
      resolvedSgpServerId,
      resolvedPage,
      resolvedPageSize,
      resolvedTag,
    ]) => {
      const res = await invoke<RawMatchSummariesResponse>(cmd, {
        puuid: resolvedPuuid,
        beginIndex: (resolvedPage - 1) * resolvedPageSize,
        endIndex: resolvedPage * resolvedPageSize,
        ...(resolvedSgpServerId ? { sgpServerId: resolvedSgpServerId } : {}),
        ...(modeTagToQueryTag(resolvedTag) ? { tag: resolvedTag } : {}),
      });

      return res.games.map((game) => {
        const me = game.json.participants.find(
          (p) => p.puuid === resolvedPuuid,
        );
        if (!me) {
          throw new Error(
            `Self participant not found for ${resolvedPuuid} in game ${game.json.gameId}`,
          );
        }
        return { ...game, me };
      });
    },
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      revalidateIfStale: autoRefreshOnSwitch,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    matches: data,
    error,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    hasNextPage: (data?.length ?? 0) === pageSize,
    refresh: () => mutate(),
  };
}
