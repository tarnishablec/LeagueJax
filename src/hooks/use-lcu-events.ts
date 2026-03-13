import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { type LcuInstanceInfo, useLcuStore } from "../stores/lcu";

export function useLcuEvents() {
  const { setInstances, setSummoner } = useLcuStore();

  useEffect(() => {
    const unlisten = listen<LcuInstanceInfo[]>("lcu-instances-changed", (e) => {
      setInstances(e.payload);

      const focused = e.payload.find((i) => i.isFocused);
      if (
        focused?.state === "ready" &&
        focused.gameName &&
        focused.tagLine &&
        focused.profileIconId != null
      ) {
        setSummoner({
          puuid: "",
          gameName: focused.gameName,
          tagLine: focused.tagLine,
          profileIconId: focused.profileIconId,
          summonerLevel: focused.summonerLevel ?? 0,
        });
      } else if (!focused) {
        setSummoner(null);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setInstances, setSummoner]);
}
