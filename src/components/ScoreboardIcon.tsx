import { useState, useSyncExternalStore } from "react";
import { useSettings } from "@/features/settings/context.tsx";
import {
  type AssetSource,
  SYSTEM_ASSET_SOURCE_SETTING_ID,
} from "@/features/settings/store/general.ts";

export const SCOREBOARD_ICON_TYPES = [
  "record",
  "gold",
  "cs",
  "damage",
] as const;
export type ScoreboardIconType = (typeof SCOREBOARD_ICON_TYPES)[number];

const CDRAGON_POSTGAME_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-postgame/global/default";

const CDRAGON_SCOREBOARD_ICON_BY_TYPE: Record<ScoreboardIconType, string> = {
  record: `${CDRAGON_POSTGAME_BASE}/scoreboard-kda-icon.svg`,
  gold: `${CDRAGON_POSTGAME_BASE}/scoreboard-coins-icon.svg`,
  cs: `${CDRAGON_POSTGAME_BASE}/scoreboard-stat-switcher-minions-slain.svg`,
  damage: `${CDRAGON_POSTGAME_BASE}/scoreboard-sword-icon.svg`,
};

const DDRAGON_SCOREBOARD_ICON_BY_TYPE: Partial<
  Record<ScoreboardIconType, string>
> = {};

function useSelectedAssetSource(): AssetSource {
  const settings = useSettings();
  return useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(SYSTEM_ASSET_SOURCE_SETTING_ID, onStoreChange),
    () =>
      settings.get<AssetSource>(SYSTEM_ASSET_SOURCE_SETTING_ID) ?? "ddragon",
    () =>
      settings.get<AssetSource>(SYSTEM_ASSET_SOURCE_SETTING_ID) ?? "ddragon",
  );
}

function resolveScoreboardIconSrc(
  type: ScoreboardIconType,
  assetSource: AssetSource,
): string {
  if (assetSource === "ddragon") {
    return (
      DDRAGON_SCOREBOARD_ICON_BY_TYPE[type] ??
      CDRAGON_SCOREBOARD_ICON_BY_TYPE[type]
    );
  }

  return CDRAGON_SCOREBOARD_ICON_BY_TYPE[type];
}

export function ScoreboardIcon({
  type,
  className,
  fallbackClassName,
}: {
  type: ScoreboardIconType;
  className: string;
  fallbackClassName: string;
}) {
  const assetSource = useSelectedAssetSource();
  const src = resolveScoreboardIconSrc(type, assetSource);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <span className={fallbackClassName} aria-hidden="true" />;
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
