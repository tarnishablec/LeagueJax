import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { selectIsFocused, useLcuStore } from "../stores/lcu";

export function useGameVersion() {
  const connected = useLcuStore(selectIsFocused);
  return useQuery<string>({
    queryKey: ["game-version"],
    queryFn: () => invoke<string>("get_game_version"),
    staleTime: Number.POSITIVE_INFINITY,
    enabled: !!connected,
  });
}
