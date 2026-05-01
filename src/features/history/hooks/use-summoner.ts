import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import type { SummonerInfo } from "@/bindings/summoner.ts";

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

export function useSummonerInfo(puuid: string | undefined) {
  return useSWR(
    puuid ? ["get_summoner_by_puuid", puuid] : null,
    ([cmd, resolvedPuuid]) =>
      invoke<SummonerInfo>(cmd, {
        puuid: resolvedPuuid,
      }),
  );
}
