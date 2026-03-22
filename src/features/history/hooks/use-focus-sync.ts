import { useEffect } from "react";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { useTabStore } from "@/stores/tabs";

/** Track the last synced pid outside of React so it survives unmount/remount. */
let lastSyncedPid: number | undefined;

export function useFocusSync(connected: LcuInstanceInfo | null | undefined) {
  const { openTab, closeAllTabs } = useTabStore();

  useEffect(() => {
    const focusedPid = connected?.pid;
    if (focusedPid === lastSyncedPid) return;
    lastSyncedPid = focusedPid;

    if (!connected) return;

    closeAllTabs();
    if (connected.summoner) {
      openTab(connected.summoner, null);
    }
  }, [connected, openTab, closeAllTabs]);
}
