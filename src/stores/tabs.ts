import { create } from "zustand";
import type { SummonerInfo } from "@/bindings/summoner.ts";

export function defaultSummonerInfo(
  partial: Partial<SummonerInfo> & { puuid: string },
): SummonerInfo {
  return {
    gameName: "",
    tagLine: "",
    profileIconId: 0,
    summonerLevel: 0,
    level: 0,
    privacy: "",
    accountId: 0,
    id: 0,
    name: "",
    internalName: "",
    expPoints: 0,
    expToNextLevel: 0,
    levelAndXpVersion: 0,
    lastGameDate: 0,
    revisionDate: 0,
    revisionId: 0,
    nameChangeFlag: false,
    unnamed: false,
    ...partial,
  };
}

export interface HistoryTab {
  id: string;
  puuid: string;
  sgpServerId: string | null;
  summoner: SummonerInfo;
}

interface TabState {
  tabs: HistoryTab[];
  activeTabId: string | null;
  openTab: (summoner: SummonerInfo, sgpServerId?: string | null) => void;
  closeTab: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (id: string) => void;
}

function mergeSummoner(
  existing: SummonerInfo,
  next: SummonerInfo,
): SummonerInfo {
  return {
    ...existing,
    gameName:
      next.gameName.trim().length > 0 ? next.gameName : existing.gameName,
    tagLine: next.tagLine.trim().length > 0 ? next.tagLine : existing.tagLine,
    profileIconId:
      next.profileIconId > 0 ? next.profileIconId : existing.profileIconId,
    summonerLevel:
      next.summonerLevel > 0 ? next.summonerLevel : existing.summonerLevel,
    privacy: next.privacy.trim().length > 0 ? next.privacy : existing.privacy,
  };
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (summoner, sgpServerId = null) => {
    const id = summoner.puuid;
    const { tabs } = get();
    const existing = tabs.find((t) => t.id === id);
    if (existing) {
      const nextTabs = tabs.map((tab) => {
        if (tab.id !== id) {
          return tab;
        }

        return {
          ...tab,
          sgpServerId: sgpServerId ?? tab.sgpServerId,
          summoner: mergeSummoner(tab.summoner, summoner),
        };
      });
      set({ tabs: nextTabs, activeTabId: id });
      return;
    }
    const tab: HistoryTab = {
      id,
      puuid: summoner.puuid,
      sgpServerId,
      summoner,
    };
    set({ tabs: [...tabs, tab], activeTabId: id });
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    const next = tabs.filter((t) => t.id !== id);
    let nextActive = activeTabId;
    if (activeTabId === id) {
      nextActive = next[Math.min(idx, next.length - 1)]?.id ?? null;
    }
    set({ tabs: next, activeTabId: nextActive });
  },

  closeTabsToRight: (id) => {
    const { tabs, activeTabId } = get();
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index < 0) {
      return;
    }

    const next = tabs.slice(0, index + 1);
    const activeStillExists = next.some((tab) => tab.id === activeTabId);
    set({
      tabs: next,
      activeTabId: activeStillExists ? activeTabId : (next[index]?.id ?? null),
    });
  },

  closeAllTabs: () => {
    set({
      tabs: [],
      activeTabId: null,
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),
}));
