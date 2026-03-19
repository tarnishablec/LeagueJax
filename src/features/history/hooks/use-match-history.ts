import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { MatchSummary } from "@/bindings/matches.ts";

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

function modeTagToQueryTag(tag: MatchModeTag): string | undefined {
  return tag === "all" ? undefined : tag;
}

export function useMatchHistory(
  puuid: string | undefined,
  page: number,
  pageSize = 20,
  modeTag: MatchModeTag = "all",
) {
  const { data, error, isLoading, isValidating } = useSWR(
    puuid ? ["get_match_history", puuid, page, pageSize, modeTag] : null,
    ([cmd, resolvedPuuid, resolvedPage, resolvedPageSize, resolvedTag]) =>
      invoke<MatchSummary[]>(cmd, {
        puuid: resolvedPuuid,
        beginIndex: (resolvedPage - 1) * resolvedPageSize,
        endIndex: resolvedPage * resolvedPageSize,
        ...(modeTagToQueryTag(resolvedTag) ? { tag: resolvedTag } : {}),
      }),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );

  const matches = data ?? [];

  return {
    matches,
    error,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    hasNextPage: matches.length === pageSize,
  };
}
