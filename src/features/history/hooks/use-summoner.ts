import { invoke } from "@tauri-apps/api/core";
import type { Accessor } from "solid-js";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { createSolidQuery } from "@/infra/solid-query";
import type { HistoryTabIdentity } from "@/stores/tabs";

type SearchSummonerKey = readonly ["search_summoner", string, string];
type SummonerByPuuidKey = readonly [
  "get_summoner_by_puuid",
  string,
  string | null,
];

export function useSolidSearchSummoner(
  gameName: Accessor<string>,
  tagLine: Accessor<string>,
  enabled: Accessor<boolean>,
) {
  return createSolidQuery<SummonerInfo>(
    () =>
      enabled() && gameName().length > 0 && tagLine().length > 0
        ? (["search_summoner", gameName(), tagLine()] as const)
        : null,
    (key) => {
      const [, resolvedGameName, resolvedTagLine] = key as SearchSummonerKey;
      return invoke<SummonerInfo>("search_summoner", {
        gameName: resolvedGameName,
        tagLine: resolvedTagLine,
      });
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

export function useSolidSummonerInfo(
  puuid: Accessor<string | undefined>,
  sgpServerId: Accessor<string | null | undefined>,
  fallbackIdentity?: Accessor<HistoryTabIdentity | undefined>,
) {
  const fallbackData = () => {
    const resolvedPuuid = puuid();
    const identity = fallbackIdentity?.();
    return resolvedPuuid && identity
      ? createFallbackSummonerInfo(resolvedPuuid, identity)
      : undefined;
  };

  return createSolidQuery<SummonerInfo>(
    () => {
      const resolvedPuuid = puuid();
      if (!resolvedPuuid) {
        return null;
      }

      return [
        "get_summoner_by_puuid",
        resolvedPuuid,
        sgpServerId()?.trim() || null,
      ] as const;
    },
    (key) => {
      const [, resolvedPuuid, resolvedSgpServerId] = key as SummonerByPuuidKey;
      return invoke<SummonerInfo>("get_summoner_by_puuid", {
        puuid: resolvedPuuid,
        ...(resolvedSgpServerId ? { sgpServerId: resolvedSgpServerId } : {}),
      });
    },
    {
      initialValue: fallbackData(),
      keepPreviousData: true,
    },
  );
}
