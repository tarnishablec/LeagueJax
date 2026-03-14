import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";

export function useProfileIcon(iconId: number | null | undefined) {
  const query = useSWR(
    iconId ? ["get_profile_icon", iconId] : null,
    async ([cmd]) => {
      const bytes = await invoke<number[]>(cmd, {
        iconId,
      });
      const uint8 = new Uint8Array(bytes);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    },
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );

  return query.data ?? null;
}
