export const SCOREBOARD_ICON_TYPES = [
  "record",
  "kda",
  "gold",
  "cs",
  "damage",
] as const;

export type ScoreboardIconType = (typeof SCOREBOARD_ICON_TYPES)[number];
