import type { TFunction } from "i18next";
import type { MatchOutcome } from "@/bindings/matches.ts";

export const CDRAGON_GAME_DATA_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";
const CDRAGON_PERK_STYLES_ICON_BASE = `${CDRAGON_GAME_DATA_BASE}/v1/perk-images/styles`;

const QUEUE_MODE_KEY_BY_ID: Record<number, string> = {
  420: "history.mode.q420",
  430: "history.mode.q430",
  440: "history.mode.q440",
  450: "history.mode.q450",
  480: "history.mode.q480",
  1700: "history.mode.q1700",
  490: "history.mode.q490",
  1900: "history.mode.q1900",
  900: "history.mode.q900",
  2300: "history.mode.q2300",
};

const MAP_NAME_KEY_BY_ID: Record<number, string> = {
  8: "history.map.crystalScar",
  10: "history.map.twistedTreeline",
  11: "history.map.summonersRift",
  12: "history.map.howlingAbyss",
  14: "history.map.butchersBridge",
  21: "history.map.nexusBlitz",
  30: "history.map.arena",
};

const GAME_MODE_KEY_BY_CODE: Record<string, string> = {
  PRACTICETOOL: "history.mode.practiceTool",
  CLASSIC: "history.mode.classic",
  ARAM: "history.mode.aram",
  URF: "history.mode.urf",
  ONEFORALL: "history.mode.oneForAll",
  NEXUSBLITZ: "history.mode.nexusBlitz",
  ULTBOOK: "history.mode.ultimateSpellbook",
  CHERRY: "history.mode.arena",
  TUTORIAL: "history.mode.tutorial",
};

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

export const DDRAGON_PERK_STYLE_ICON_BY_ID: Record<number, string> = {
  8000: "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/Precision.png",
  8100: "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/Domination.png",
  8200: "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Sorcery/Sorcery.png",
  8300: "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Inspiration/Inspiration.png",
  8400: "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Resolve/Resolve.png",
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

  return date.toLocaleString(undefined, {
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
): string {
  const key = QUEUE_MODE_KEY_BY_ID[queueId];
  if (key) {
    return t(key);
  }
  const normalizedGameMode = normalizeGameModeCode(gameMode.trim());
  const modeKey = GAME_MODE_KEY_BY_CODE[normalizedGameMode];
  if (modeKey) {
    return t(modeKey);
  }

  if (gameMode.trim().length > 0) {
    return gameMode.trim();
  }
  return t("history.mode.unknown", {
    queueId,
    defaultValue: `Queue ${queueId}`,
  });
}

export function resolveMapLabel(t: TFunction, mapId: number): string {
  const key = MAP_NAME_KEY_BY_ID[mapId];
  if (key) {
    return t(key);
  }
  return t("history.map.unknown", {
    mapId,
    defaultValue: `Map ${mapId}`,
  });
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

export function normalizeMatchOutcome(
  outcome: MatchOutcome | undefined,
  win: boolean,
): MatchOutcome {
  if (outcome === "victory" || outcome === "defeat") {
    return outcome;
  }
  if (outcome === "remake" || outcome === "terminated") {
    return outcome;
  }
  return win ? "victory" : "defeat";
}

export function resolveOutcomeLabel(
  t: TFunction,
  outcome: MatchOutcome | undefined,
  win: boolean,
): string {
  const normalized = normalizeMatchOutcome(outcome, win);
  switch (normalized) {
    case "victory":
      return t("history.victory");
    case "defeat":
      return t("history.defeat");
    case "remake":
      return t("history.match.outcome.remake", { defaultValue: "Remake" });
    case "terminated":
      return t("history.match.outcome.terminated", {
        defaultValue: "Terminated",
      });
  }
}
