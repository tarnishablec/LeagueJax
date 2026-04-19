import type { TFunction } from "i18next";

export const CDRAGON_GAME_DATA_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";
const CDRAGON_PERK_STYLES_ICON_BASE = `${CDRAGON_GAME_DATA_BASE}/v1/perk-images/styles`;

const RUNE_STYLE_KEY_BY_ID: Record<number, string> = {
  8000: "history.runeStyle.precision",
  8100: "history.runeStyle.domination",
  8200: "history.runeStyle.sorcery",
  8300: "history.runeStyle.inspiration",
  8400: "history.runeStyle.resolve",
};

export const CDRAGON_PERK_STYLE_ICON_BY_ID: Record<number, string> = {
  8100: `${CDRAGON_PERK_STYLES_ICON_BASE}/7200_domination.png`,
  8000: `${CDRAGON_PERK_STYLES_ICON_BASE}/7201_precision.png`,
  8200: `${CDRAGON_PERK_STYLES_ICON_BASE}/7202_sorcery.png`,
  8300: `${CDRAGON_PERK_STYLES_ICON_BASE}/7203_whimsy.png`,
  8400: `${CDRAGON_PERK_STYLES_ICON_BASE}/7204_resolve.png`,
};

function normalizeGameModeCode(value: string): string {
  return value
    .toUpperCase()
    .split("")
    .filter((current) => /[A-Z0-9]/.test(current))
    .join("");
}

export function formatDuration(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const minutes = Math.floor(clamped / 60);
  const remainingSeconds = clamped % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function formatDamage(damage: number): string {
  return new Intl.NumberFormat().format(Math.max(0, damage));
}

export function formatDamageShare(damageShare: number): string {
  const value = Number.isFinite(damageShare) ? damageShare : 0;
  return `${(value * 100).toFixed(1)}%`;
}

export function formatStartTime(epoch: number): string {
  const millis = epoch > 2_000_000_000 ? epoch : epoch * 1000;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const now = new Date();
  const shouldShowYear = date.getFullYear() !== now.getFullYear();

  return date.toLocaleString(undefined, {
    ...(shouldShowYear ? { year: "numeric" as const } : {}),
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function resolveModeLabel(
  t: TFunction,
  queueId: number,
  gameMode: string,
  queueName?: string | null,
): string {
  const normalizedGameMode = normalizeGameModeCode(gameMode.trim());
  if (normalizedGameMode === "PRACTICETOOL") {
    return t("history.mode.practiceTool");
  }

  if (queueName && queueName.trim().length > 0) {
    return queueName.trim();
  }

  return `Queue ${queueId}`;
}

export function resolveRuneSubStyleLabel(
  t: TFunction,
  styleId: number,
): string {
  const key = RUNE_STYLE_KEY_BY_ID[styleId];
  if (key) {
    return t(key);
  }
  return t("history.runeStyle.unknown", {
    styleId,
    defaultValue: `Style ${styleId}`,
  });
}
