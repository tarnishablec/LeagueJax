import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { SummonerInfo } from "../types";

export function useSearchSummoner(
  gameName: string,
  tagLine: string,
  enabled: boolean,
) {
  return useQuery<SummonerInfo>({
    queryKey: ["summoner", gameName, tagLine],
    queryFn: () =>
      invoke<SummonerInfo>("search_summoner", { gameName, tagLine }),
    enabled: enabled && gameName.length > 0 && tagLine.length > 0,
    retry: false,
  });
}
