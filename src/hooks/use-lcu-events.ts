import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import {
  type CurrentSummoner,
  type LcuConnectionState,
  useLcuStore,
} from "../stores/lcu";

export function useLcuEvents() {
  const { setConnection, setSummoner } = useLcuStore();

  useEffect(() => {
    const unlisten = listen<LcuConnectionState>(
      "lcu-state-change",
      async (e) => {
        setConnection(e.payload);

        if (e.payload.state === "connected") {
          try {
            const summoner = await invoke<CurrentSummoner>(
              "get_current_summoner",
            );
            setSummoner(summoner);
          } catch {
            // LCU may not be fully ready yet
          }
        } else if (e.payload.state === "detecting") {
          setSummoner(null);
        }
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setConnection, setSummoner]);
}
