import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import type { HistoryTabIdentity } from "@/stores/tabs.ts";

export function useSearchSummoner(
  gameName: string,
  tagLine: string,
  enabled: boolean,
) {
  return useSWR(
    enabled && gameName.length > 0 && tagLine.length > 0
      ? ["summoner", gameName, tagLine]
      : null,
    () => invoke<SummonerInfo>("search_summoner", { gameName, tagLine }),
    {},
  );
}

export function useSummonerInfo(
  puuid: string | undefined,
  sgpServerId?: string | null,
  fallbackIdentity?: HistoryTabIdentity,
) {
  const normalizedSgpServerId = sgpServerId?.trim() || null;
  const fallbackData =
    puuid && fallbackIdentity
      ? createFallbackSummonerInfo(puuid, fallbackIdentity)
      : undefined;

  return useSWR(
    puuid ? ["get_summoner_by_puuid", puuid, normalizedSgpServerId] : null,
    ([cmd, resolvedPuuid, resolvedSgpServerId]) =>
      invoke<SummonerInfo>(cmd, {
        puuid: resolvedPuuid,
        ...(resolvedSgpServerId ? { sgpServerId: resolvedSgpServerId } : {}),
      }),
    {
      fallbackData,
    },
  );
}

function createFallbackSummonerInfo(
  puuid: string,
  identity: HistoryTabIdentity,
): SummonerInfo {
  const summonerLevel = identity.summonerLevel ?? 0;

  return {
    puuid,
    gameName: identity.gameName,
    tagLine: identity.tagLine,
    profileIconId: identity.profileIconId ?? 0,
    summonerLevel,
    level: summonerLevel,
    privacy: identity.privacy ?? "",
    accountId: 0,
    id: 0,
    summonerId: 0,
    name: identity.gameName,
    internalName: identity.gameName,
    expPoints: 0,
    expToNextLevel: 0,
    levelAndXpVersion: 0,
    lastGameDate: 0,
    revisionDate: 0,
    revisionId: 0,
    nameChangeFlag: false,
    unnamed: false,
  };
}
