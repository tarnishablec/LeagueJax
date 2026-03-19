import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import { toDdragonVersion } from "./to-ddragon-version";
import { useGameVersion } from "./use-game-version";

export function useProfileIcon(iconId: number | null | undefined) {
  const connected = useLcuStore(selectIsFocused);
  const { data: gameVersion } = useGameVersion();
  const ddragonVersion = toDdragonVersion(gameVersion);

  if (!connected || !iconId || !ddragonVersion) {
    return null;
  }

  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${iconId}.png`;
}
