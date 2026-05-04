import { useState } from "react";

export const SCOREBOARD_ICON_TYPES = [
  "record",
  "kda",
  "gold",
  "cs",
  "damage",
] as const;
export type ScoreboardIconType = (typeof SCOREBOARD_ICON_TYPES)[number];

const CDRAGON_POSTGAME_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-postgame/global/default";

const CDRAGON_SCOREBOARD_ICON_BY_TYPE: Record<ScoreboardIconType, string> = {
  record: `${CDRAGON_POSTGAME_BASE}/scoreboard-kda-icon.svg`,
  kda: `${CDRAGON_POSTGAME_BASE}/scoreboard-row-stat-star-icon.svg`,
  gold: `${CDRAGON_POSTGAME_BASE}/scoreboard-coins-icon.svg`,
  cs: `${CDRAGON_POSTGAME_BASE}/scoreboard-stat-switcher-minions-slain.svg`,
  damage: `${CDRAGON_POSTGAME_BASE}/scoreboard-sword-icon.svg`,
};

function resolveScoreboardIconSrc(type: ScoreboardIconType): string {
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
  const src = resolveScoreboardIconSrc(type);
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
