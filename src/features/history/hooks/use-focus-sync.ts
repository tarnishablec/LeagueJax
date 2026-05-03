import { useEffect } from "react";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { useTabStore } from "@/stores/tabs";

/** Track the last synced pid outside of React so it survives unmount/remount. */
let lastSyncedPid: number | undefined;

export function useFocusSync(
  connected: LcuInstanceInfo | null | undefined,
  autoOpenOwnTab: boolean,
  focusedServerId: string | null,
) {
  const { openTab, closeAllTabs } = useTabStore();

  useEffect(() => {
    const focusedPid = connected?.pid;
    const hadFocusedClient = lastSyncedPid !== undefined;
    const didDisconnect = hadFocusedClient && focusedPid === undefined;
    const didChangeFocusedClient =
      focusedPid !== undefined && focusedPid !== lastSyncedPid;

    if (!didDisconnect && !didChangeFocusedClient) return;
    lastSyncedPid = focusedPid;

    if (didDisconnect || didChangeFocusedClient) {
      closeAllTabs();
    }

    if (connected && autoOpenOwnTab && connected.summoner) {
      openTab(connected.summoner.puuid, focusedServerId);
    }
  }, [connected, autoOpenOwnTab, focusedServerId, openTab, closeAllTabs]);
}
