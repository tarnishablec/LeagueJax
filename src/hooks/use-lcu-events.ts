import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import {
  type CurrentSummoner,
  type LcuInstanceInfo,
  useLcuStore,
} from "../stores/lcu";

export function useLcuEvents() {
  const { setInstances, setSummoner } = useLcuStore();

  useEffect(() => {
    const unlisten = listen<LcuInstanceInfo[]>(
      "lcu-instances-changed",
      async (e) => {
        setInstances(e.payload);

        const focused = e.payload.find((i) => i.isFocused);
        if (focused && focused.state === "ready") {
          try {
            const summoner = await invoke<CurrentSummoner>(
              "get_current_summoner",
            );
            setSummoner(summoner);
          } catch {
            // LCU may not be fully ready yet
          }
        } else if (!focused) {
          setSummoner(null);
        }
      },
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setInstances, setSummoner]);
}
