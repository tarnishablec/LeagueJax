import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import { useGameVersion } from "./use-game-version";

function toDdragonVersion(version: string | undefined): string | null {
  if (!version || version.trim().length === 0) {
    return null;
  }

  const segments = version
    .trim()
    .split(".")
    .filter((segment) => segment.length > 0);

  if (segments.length < 2) {
    return null;
  }

  const major = segments[0];
  const minor = segments[1];
  const patch = segments[2] ?? "1";
  return `${major}.${minor}.${patch}`;
}

export function useProfileIcon(iconId: number | null | undefined) {
  const connected = useLcuStore(selectIsFocused);
  const { data: gameVersion } = useGameVersion();
  const ddragonVersion = toDdragonVersion(gameVersion);

  if (!connected || !iconId || !ddragonVersion) {
    return null;
  }

  return `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${iconId}.png`;
}
