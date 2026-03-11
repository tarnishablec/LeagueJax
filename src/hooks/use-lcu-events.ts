import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { type CurrentSummoner, useLcuStore } from "../stores/lcu";

export function useLcuEvents() {
  const { setConnected, setDisconnected, setSummoner } = useLcuStore();

  useEffect(() => {
    const unlisteners = [
      listen<{ port: number }>("lcu-connected", async (e) => {
        setConnected(e.payload.port);
        try {
          const summoner = await invoke<CurrentSummoner>(
            "get_current_summoner",
          );
          setSummoner(summoner);
        } catch {
          // LCU may not be fully ready yet
        }
      }),
      listen("lcu-disconnected", () => {
        setDisconnected();
      }),
    ];

    return () => {
      for (const p of unlisteners) {
        p.then((fn) => fn());
      }
    };
  }, [setConnected, setDisconnected, setSummoner]);
}
