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
