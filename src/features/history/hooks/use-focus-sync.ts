import { useEffect } from "react";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { useTabStore } from "@/stores/tabs";

/** Track the last synced pid outside of React so it survives unmount/remount. */
let lastSyncedPid: number | undefined;

export function useFocusSync(
  connected: LcuInstanceInfo | null | undefined,
  autoOpenOwnTab: boolean,
) {
  const { openTab, closeAllTabs } = useTabStore();

  useEffect(() => {
    const focusedPid = connected?.pid;
    const hadFocusedClient = lastSyncedPid !== undefined;
    const didDisconnect = hadFocusedClient && focusedPid === undefined;
    const didConnectToNewClient =
      focusedPid !== undefined && focusedPid !== lastSyncedPid;

    if (!didDisconnect && !didConnectToNewClient) return;
    lastSyncedPid = focusedPid;

    if (didDisconnect) {
      closeAllTabs();
      return;
    }

    if (connected && autoOpenOwnTab && connected.summoner) {
      openTab(connected.summoner, null);
    }
  }, [connected, autoOpenOwnTab, openTab, closeAllTabs]);
}
