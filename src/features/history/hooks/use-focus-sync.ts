import { useEffect, useRef } from "react";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { useTabStore } from "@/stores/tabs";

export function useFocusSync(connected: LcuInstanceInfo | null | undefined) {
  const { openTab, closeAllTabs } = useTabStore();
  const prevFocusedPidRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const focusedPid = connected?.pid;
    if (focusedPid === prevFocusedPidRef.current) return;
    prevFocusedPidRef.current = focusedPid;

    if (!connected) return;

    closeAllTabs();
    if (connected.summoner) {
      openTab(connected.summoner, null);
    }
  }, [connected, openTab, closeAllTabs]);
}
