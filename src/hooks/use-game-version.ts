import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";
import { selectIsFocused, useLcuStore } from "../stores/lcu";

export function useGameVersion() {
  const connected = useLcuStore(selectIsFocused);

  return useSWR(
    connected ? "lcu_get_game_version" : null,
    (cmd) => invoke<string>(cmd),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
    },
  );
}
