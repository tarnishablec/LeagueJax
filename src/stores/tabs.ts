import { create } from "zustand";
import type { SummonerInfo } from "@/bindings/summoner.ts";

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
  setActiveTab: (id: string) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (summoner, sgpServerId = null) => {
    const id = summoner.puuid;
    const { tabs } = get();
    const existing = tabs.find((t) => t.id === id);
    if (existing) {
      set({ activeTabId: id });
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

  setActiveTab: (id) => set({ activeTabId: id }),
}));
