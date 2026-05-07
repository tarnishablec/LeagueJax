import { useEffect } from "react";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { useTabStore } from "@/stores/tabs";

/** Track the last synced pid outside of React so it survives unmount/remount. */
let lastSyncedPid: number | undefined;

export type FocusSyncActions = {
  closeAllTabs: boolean;
  nextSyncedPid: number | undefined;
  openOwnTab: boolean;
};

export function resolveFocusSyncActions({
  autoOpenOwnTab,
  connectedHasSummoner,
  focusedPid,
  hasExistingTabs,
  lastSyncedPid,
}: {
  autoOpenOwnTab: boolean;
  connectedHasSummoner: boolean;
  focusedPid: number | undefined;
  hasExistingTabs: boolean;
  lastSyncedPid: number | undefined;
}): FocusSyncActions {
  const hadFocusedClient = lastSyncedPid !== undefined;
  const hasFocusedClient = focusedPid !== undefined;
  const didDisconnect = hadFocusedClient && !hasFocusedClient;
  const didChangeFocusedClient =
    hadFocusedClient && hasFocusedClient && focusedPid !== lastSyncedPid;
  const didFirstObserveFocusedClient = !hadFocusedClient && hasFocusedClient;

  if (
    !didDisconnect &&
    !didChangeFocusedClient &&
    !didFirstObserveFocusedClient
  ) {
    return {
      closeAllTabs: false,
      nextSyncedPid: lastSyncedPid,
      openOwnTab: false,
    };
  }

  const canOpenOwnTab =
    autoOpenOwnTab && connectedHasSummoner && hasFocusedClient;
  const shouldOpenOwnTab =
    canOpenOwnTab &&
    (didChangeFocusedClient ||
      (didFirstObserveFocusedClient && !hasExistingTabs));

  return {
    closeAllTabs: didDisconnect || didChangeFocusedClient,
    nextSyncedPid: focusedPid,
    openOwnTab: shouldOpenOwnTab,
  };
}

export function useFocusSync(
  connected: LcuInstanceInfo | null | undefined,
  autoOpenOwnTab: boolean,
  focusedServerId: string | null,
) {
  const openTab = useTabStore((state) => state.openTab);
  const closeAllTabs = useTabStore((state) => state.closeAllTabs);
  const hasExistingTabs = useTabStore((state) => state.tabs.length > 0);

  useEffect(() => {
    const focusedPid = connected?.pid;
    const actions = resolveFocusSyncActions({
      autoOpenOwnTab,
      connectedHasSummoner: Boolean(connected?.summoner),
      focusedPid,
      hasExistingTabs,
      lastSyncedPid,
    });

    if (
      !actions.closeAllTabs &&
      !actions.openOwnTab &&
      actions.nextSyncedPid === lastSyncedPid
    ) {
      return;
    }

    lastSyncedPid = actions.nextSyncedPid;

    if (actions.closeAllTabs) {
      closeAllTabs();
    }

    if (actions.openOwnTab && connected?.summoner) {
      openTab(connected.summoner.puuid, focusedServerId);
    }
  }, [
    connected,
    autoOpenOwnTab,
    focusedServerId,
    hasExistingTabs,
    openTab,
    closeAllTabs,
  ]);
}
