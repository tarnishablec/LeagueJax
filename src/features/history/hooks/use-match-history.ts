import { invoke } from "@tauri-apps/api/core";
import type { Accessor } from "solid-js";
import type {
  RawMatchSummariesResponse,
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { createSolidQuery } from "@/infra/solid-query";
import type { MatchModeTag } from "../types/match-mode";

export type EnrichedMatch = RawMatchSummaryGame & {
  me: RawMatchSummaryParticipant;
};

type MatchHistoryKey = readonly [
  "get_match_summaries",
  string,
  string | null,
  number,
  number,
  MatchModeTag,
  boolean,
];

function modeTagToQueryTag(tag: MatchModeTag): string | undefined {
  return tag === "all" ? undefined : tag;
}

export function useSolidMatchHistory(params: {
  puuid: Accessor<string | undefined>;
  sgpServerId: Accessor<string | null>;
  page: Accessor<number>;
  pageSize: Accessor<number>;
  modeTag: Accessor<MatchModeTag>;
  autoRefreshOnSwitch: Accessor<boolean>;
}) {
  const query = createSolidQuery<EnrichedMatch[]>(
    () => {
      const resolvedPuuid = params.puuid();
      return resolvedPuuid
        ? ([
            "get_match_summaries",
            resolvedPuuid,
            params.sgpServerId(),
            params.page(),
            params.pageSize(),
            params.modeTag(),
            params.autoRefreshOnSwitch(),
          ] as const)
        : null;
    },
    async (key) => {
      const [
        cmd,
        resolvedPuuid,
        resolvedSgpServerId,
        resolvedPage,
        resolvedPageSize,
        resolvedTag,
      ] = key as MatchHistoryKey;
      const res = await invoke<RawMatchSummariesResponse>(cmd, {
        puuid: resolvedPuuid,
        beginIndex: (resolvedPage - 1) * resolvedPageSize,
        endIndex: resolvedPage * resolvedPageSize,
        ...(resolvedSgpServerId ? { sgpServerId: resolvedSgpServerId } : {}),
        ...(modeTagToQueryTag(resolvedTag) ? { tag: resolvedTag } : {}),
      });

      return res.games.map((game) => {
        const me = game.json.participants.find(
          (participant) => participant.puuid === resolvedPuuid,
        );
        if (!me) {
          throw new Error(
            `Self participant not found for ${resolvedPuuid} in game ${game.json.gameId}`,
          );
        }
        return { ...game, me };
      });
    },
    { keepPreviousData: true },
  );

  return {
    matches: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isRefreshing: query.isValidating,
    hasNextPage: () => (query.data()?.length ?? 0) === params.pageSize(),
    refresh: query.refetch,
  };
}
