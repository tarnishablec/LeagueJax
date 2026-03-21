import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import type { HistoryTab } from "@/stores/tabs";
import { useTabStore } from "@/stores/tabs";

export function useSummonerHydration(
  connected: boolean,
  activeTab: HistoryTab | undefined,
) {
  const openTab = useTabStore((state) => state.openTab);

  const puuid = activeTab?.puuid;
  const sgpServerId = activeTab?.sgpServerId ?? null;
  const profileIconId = activeTab?.summoner.profileIconId ?? 0;
  const summonerLevel = activeTab?.summoner.summonerLevel ?? 0;
  const gameName = activeTab?.summoner.gameName ?? "";
  const tagLine = activeTab?.summoner.tagLine ?? "";

  useEffect(() => {
    if (!connected || !puuid) {
      return;
    }

    const shouldHydrate =
      profileIconId <= 0 ||
      summonerLevel <= 0 ||
      gameName.trim().length === 0 ||
      tagLine.trim().length === 0;
    if (!shouldHydrate) {
      return;
    }

    let cancelled = false;
    void invoke<SummonerInfo>("get_summoner_by_puuid", {
      puuid,
    })
      .then((summoner) => {
        if (cancelled) {
          return;
        }
        openTab(summoner, sgpServerId);
      })
      .catch(() => {
        // no-op: keep the last known summary when lookup fails
      });

    return () => {
      cancelled = true;
    };
  }, [
    connected,
    puuid,
    sgpServerId,
    profileIconId,
    summonerLevel,
    gameName,
    tagLine,
    openTab,
  ]);
}
