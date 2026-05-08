import { describe, expect, test } from "bun:test";
import type { LcuInstanceInfo } from "@/bindings/lcu";
import {
  createHistoryFocusSyncController,
  resolveFocusSyncActions,
} from "./use-focus-sync";

function client(pid: number, puuid: string): LcuInstanceInfo {
  return {
    pid,
    port: 0,
    state: "ready",
    isFocused: true,
    installDir: null,
    region: "NA1",
    summoner: {
      puuid,
      gameName: `Summoner ${pid}`,
      tagLine: "NA1",
      profileIconId: 0,
      summonerLevel: 1,
      level: 1,
      privacy: "",
      accountId: 0,
      id: 0,
      summonerId: 0,
      name: `Summoner ${pid}`,
      internalName: `Summoner ${pid}`,
      expPoints: 0,
      expToNextLevel: 0,
      levelAndXpVersion: 0,
      lastGameDate: 0,
      revisionDate: 0,
      revisionId: 0,
      nameChangeFlag: false,
      unnamed: false,
    },
    cmdArgs: {
      family: "riot",
      region: "NA1",
    } as LcuInstanceInfo["cmdArgs"],
  };
}

describe("resolveFocusSyncActions", () => {
  test("preserves an explicitly opened tab on first history route mount", () => {
    expect(
      resolveFocusSyncActions({
        autoOpenOwnTab: true,
        connectedHasSummoner: true,
        focusedPid: 1001,
        hasExistingTabs: true,
        lastSyncedPid: undefined,
      }),
    ).toEqual({
      closeAllTabs: false,
      nextSyncedPid: 1001,
      openOwnTab: false,
    });
  });

  test("auto-opens own tab on first history route mount when no tab exists", () => {
    expect(
      resolveFocusSyncActions({
        autoOpenOwnTab: true,
        connectedHasSummoner: true,
        focusedPid: 1001,
        hasExistingTabs: false,
        lastSyncedPid: undefined,
      }),
    ).toEqual({
      closeAllTabs: false,
      nextSyncedPid: 1001,
      openOwnTab: true,
    });
  });

  test("replaces tabs when the focused client changes after initial sync", () => {
    expect(
      resolveFocusSyncActions({
        autoOpenOwnTab: true,
        connectedHasSummoner: true,
        focusedPid: 1002,
        hasExistingTabs: true,
        lastSyncedPid: 1001,
      }),
    ).toEqual({
      closeAllTabs: true,
      nextSyncedPid: 1002,
      openOwnTab: true,
    });
  });

  test("keeps explicit tabs after focused client changes were already synchronized", () => {
    let connected = client(1001, "own-puuid-1");
    let focusedServerId: string | null = "NA1";
    let tabs: string[] = [];
    let activeTabId: string | null = null;
    const lcuListeners = new Set<() => void>();
    const settingListeners = new Set<() => void>();

    const openTab = (puuid: string) => {
      if (!tabs.includes(puuid)) {
        tabs = [...tabs, puuid];
      }
      activeTabId = puuid;
    };
    const getActiveTabId = (): string | null => activeTabId;

    const emitLcuChange = () => {
      for (const listener of lcuListeners) {
        listener();
      }
    };

    const controller = createHistoryFocusSyncController({
      closeAllTabs: () => {
        tabs = [];
        activeTabId = null;
      },
      getAutoOpenOwnTab: () => true,
      getConnected: () => connected,
      getFocusedServerId: () => focusedServerId,
      hasExistingTabs: () => tabs.length > 0,
      openTab,
      subscribeAutoOpenOwnTab: (listener) => {
        settingListeners.add(listener);
        return () => settingListeners.delete(listener);
      },
      subscribeFocusedClient: (listener) => {
        lcuListeners.add(listener);
        return () => lcuListeners.delete(listener);
      },
    });

    controller.start();
    expect(getActiveTabId()).toBe("own-puuid-1");

    connected = client(1002, "own-puuid-2");
    focusedServerId = "EUW";
    emitLcuChange();
    expect(tabs).toEqual(["own-puuid-2"]);
    expect(getActiveTabId()).toBe("own-puuid-2");

    openTab("clicked-player-puuid");
    emitLcuChange();

    expect(tabs).toEqual(["own-puuid-2", "clicked-player-puuid"]);
    expect(getActiveTabId()).toBe("clicked-player-puuid");

    controller.stop();
  });
});
