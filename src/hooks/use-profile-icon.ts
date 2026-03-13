import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export function useProfileIcon(iconId: number | null | undefined) {
  const query = useQuery({
    queryKey: ["profile-icon", iconId],
    queryFn: async () => {
      const bytes = await invoke<number[]>("get_profile_icon", {
        iconId,
      });
      const uint8 = new Uint8Array(bytes);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    },
    enabled: iconId != null,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return query.data ?? null;
}
