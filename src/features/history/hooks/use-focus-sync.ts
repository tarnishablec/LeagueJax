import type { LcuInstanceInfo } from "@/bindings/lcu.ts";

export type FocusSyncActions = {
  closeAllTabs: boolean;
  nextSyncedPid: number | undefined;
  openOwnTab: boolean;
};

type Unsubscribe = () => void;

export type HistoryFocusSyncController = {
  start: () => void;
  stop: () => void;
};

export type HistoryFocusSyncControllerOptions = {
  closeAllTabs: () => void;
  getAutoOpenOwnTab: () => boolean;
  getConnected: () => LcuInstanceInfo | null | undefined;
  getFocusedServerId: () => string | null;
  hasExistingTabs: () => boolean;
  openTab: (puuid: string, sgpServerId: string | null) => void;
  subscribeAutoOpenOwnTab: (listener: () => void) => Unsubscribe;
  subscribeFocusedClient: (listener: () => void) => Unsubscribe;
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

export function createHistoryFocusSyncController(
  options: HistoryFocusSyncControllerOptions,
): HistoryFocusSyncController {
  let started = false;
  let lastSyncedPid: number | undefined;
  let unsubscribes: Unsubscribe[] = [];

  const sync = () => {
    const connected = options.getConnected();
    const actions = resolveFocusSyncActions({
      autoOpenOwnTab: options.getAutoOpenOwnTab(),
      connectedHasSummoner: Boolean(connected?.summoner),
      focusedPid: connected?.pid,
      hasExistingTabs: options.hasExistingTabs(),
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
      options.closeAllTabs();
    }

    if (actions.openOwnTab && connected?.summoner) {
      options.openTab(connected.summoner.puuid, options.getFocusedServerId());
    }
  };

  return {
    start: () => {
      if (started) {
        return;
      }

      started = true;
      unsubscribes = [
        options.subscribeFocusedClient(sync),
        options.subscribeAutoOpenOwnTab(sync),
      ];
      sync();
    },
    stop: () => {
      if (!started) {
        return;
      }

      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }

      started = false;
      lastSyncedPid = undefined;
      unsubscribes = [];
    },
  };
}
