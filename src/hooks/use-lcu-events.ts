import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { useLcuStore } from "../stores/lcu";

export function useLcuEvents() {
  const { setInstances } = useLcuStore();

  useEffect(() => {
    const unlisten = listen<LcuInstanceInfo[]>("lcu-instances-changed", (e) => {
      setInstances(e.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setInstances]);
}
