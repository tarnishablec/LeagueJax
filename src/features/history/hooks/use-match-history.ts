import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type {
  RawMatchSummariesResponse,
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";

export type MatchModeTag =
  | "all"
  | "q_420"
  | "q_430"
  | "q_440"
  | "q_450"
  | "q_480"
  | "q_1700"
  | "q_490"
  | "q_1900"
  | "q_900"
  | "q_2300";

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
) {
  const { data, error, isLoading, isValidating } = useSWR(
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
    },
  );

  return {
    matches: data,
    error,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    hasNextPage: (data?.length ?? 0) === pageSize,
  };
}
