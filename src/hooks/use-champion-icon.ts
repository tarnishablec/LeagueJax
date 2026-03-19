import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";

export function useChampionIcon(championId: number | null | undefined) {
  const connected = useLcuStore(selectIsFocused);

  const query = useSWR(
    connected && championId ? ["get_champion_icon", championId] : null,
    async ([cmd]) => {
      const bytes = await invoke<number[]>(cmd, {
        championId,
      });
      const uint8 = new Uint8Array(bytes);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return `data:image/png;base64,${btoa(binary)}`;
    },
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );

  return query.data ?? null;
}
