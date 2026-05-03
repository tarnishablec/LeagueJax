import { create } from "zustand";

export interface HistoryTab {
  id: string;
  puuid: string;
  sgpServerId: string | null;
  identity?: HistoryTabIdentity;
}

export interface HistoryTabIdentity {
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  summonerLevel?: number;
  privacy?: string;
}

interface TabState {
  tabs: HistoryTab[];
  activeTabId: string | null;
  openTab: (
    puuid: string,
    sgpServerId?: string | null,
    identity?: HistoryTabIdentity,
  ) => void;
  closeTab: (id: string) => void;
  closeTabsToRight: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (id: string) => void;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (puuid, sgpServerId = null, identity) => {
    const id = puuid.trim();
    if (id.length === 0) {
      return;
    }

    const { tabs } = get();
    const existing = tabs.find((t) => t.id === id);
    if (existing) {
      const nextTabs = tabs.map((tab) => {
        if (tab.id !== id) {
          return tab;
        }

        const nextIdentity = identity ?? tab.identity;
        return {
          ...tab,
          sgpServerId: sgpServerId ?? tab.sgpServerId,
          ...(nextIdentity ? { identity: nextIdentity } : {}),
        };
      });
      set({ tabs: nextTabs, activeTabId: id });
      return;
    }
    const tab: HistoryTab = {
      id,
      puuid: id,
      sgpServerId,
      ...(identity ? { identity } : {}),
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

  closeOtherTabs: (id) => {
    const { tabs, activeTabId } = get();
    const next = tabs.filter((tab) => tab.id === id);
    if (next.length === tabs.length) {
      return;
    }

    const activeStillExists = next.some((tab) => tab.id === activeTabId);
    set({
      tabs: next,
      activeTabId: activeStillExists ? activeTabId : (next[0]?.id ?? null),
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
