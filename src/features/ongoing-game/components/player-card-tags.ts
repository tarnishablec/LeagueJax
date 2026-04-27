import type { TFunction } from "i18next";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { resolveRecentGameResult } from "../routes/ongoing-game.history-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";

export const ONGOING_PLAYER_CARD_TAGS_ENABLED_SETTING =
  "ongoing.playerCardTags.enabledIds" as const;
export const ONGOING_PLAYER_CARD_TAGS_COLORS_SETTING =
  "ongoing.playerCardTags.colors" as const;

const FLASH_SPELL_ID = 4;
const MIN_STREAK_COUNT = 3;
const EXCELLENT_AVERAGE_KDA = 5;
const DEFAULT_TAG_COLOR = "oklch(0.72 0.19 62)";

export type PlayerCardMatch = RawMatchSummaryGame & {
  me: RawMatchSummaryParticipant;
};

export type PlayerCardTagTone =
  | "bad"
  | "good"
  | "info"
  | "neutral"
  | "self"
  | "warning";

export type ResolvedPlayerCardTag = {
  color: string;
  id: string;
  order: number;
  text: string;
  tone: PlayerCardTagTone;
};

type PlayerCardMatchTagDefinition = {
  id: string;
  settingLabelKey: string;
  order: number;
  defaultEnabled: boolean;
  defaultColor: string;
  tone: PlayerCardTagTone;
  evaluate: (matches: PlayerCardMatch[]) => boolean;
  formatLabel: (matches: PlayerCardMatch[], t: TFunction) => string;
};

type PlayerCardSpecialTagDefinition = {
  id: string;
  settingLabelKey: string;
  cardLabelKey: string;
  order: number;
  defaultEnabled: boolean;
  defaultColor: string;
  tone: PlayerCardTagTone;
};

export type PlayerCardTagSettingItem = {
  id: string;
  label: string;
  order: number;
  defaultEnabled: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function srgbChannelToLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function linearChannelToSrgb(value: number): number {
  const normalized =
    value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(clamp(normalized, 0, 1) * 255);
}

function formatHexChannel(value: number): string {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function parseHexColor(
  value: string,
): { r: number; g: number; b: number } | null {
  const normalized = value.trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(normalized);
  if (!match) {
    return null;
  }

  const hex = match[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function parseOklchColor(
  value: string,
): { l: number; c: number; h: number } | null {
  const match =
    /^oklch\(\s*([+-]?\d*\.?\d+%?)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)(?:deg)?(?:\s*\/\s*[+-]?\d*\.?\d+%?)?\s*\)$/i.exec(
      value.trim(),
    );
  if (!match) {
    return null;
  }

  const lightnessText = match[1];
  const l = lightnessText.endsWith("%")
    ? Number(lightnessText.slice(0, -1)) / 100
    : Number(lightnessText);
  const c = Number(match[2]);
  const h = Number(match[3]);

  if (![l, c, h].every(Number.isFinite)) {
    return null;
  }

  return { l: clamp(l, 0, 1), c: Math.max(0, c), h };
}

export function hexToOklchColor(value: string): string {
  const rgb = parseHexColor(value);
  if (!rgb) {
    return DEFAULT_TAG_COLOR;
  }

  const r = srgbChannelToLinear(rgb.r);
  const g = srgbChannelToLinear(rgb.g);
  const b = srgbChannelToLinear(rgb.b);
  const lmsL = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const lmsM = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const lmsS = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const lRoot = Math.cbrt(lmsL);
  const mRoot = Math.cbrt(lmsM);
  const sRoot = Math.cbrt(lmsS);
  const l = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const labB =
    0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
  const c = Math.sqrt(a * a + labB * labB);
  const h = (Math.atan2(labB, a) * 180) / Math.PI;
  const normalizedHue = h < 0 ? h + 360 : h;

  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${normalizedHue.toFixed(1)})`;
}

export function oklchColorToHex(value: string): string {
  const parsed = parseOklchColor(value) ?? parseOklchColor(DEFAULT_TAG_COLOR);
  if (!parsed) {
    return oklchColorToHex(DEFAULT_TAG_COLOR);
  }

  const hRad = (parsed.h * Math.PI) / 180;
  const a = parsed.c * Math.cos(hRad);
  const b = parsed.c * Math.sin(hRad);
  const lRoot = parsed.l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = parsed.l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = parsed.l - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  const rLinear = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const r = linearChannelToSrgb(rLinear);
  const g = linearChannelToSrgb(gLinear);
  const blue = linearChannelToSrgb(bLinear);

  return `#${formatHexChannel(r)}${formatHexChannel(g)}${formatHexChannel(blue)}`;
}

function isPlayerCardTagColor(value: unknown): value is string {
  return typeof value === "string" && parseOklchColor(value) !== null;
}

function participantKda(participant: RawMatchSummaryParticipant): number {
  return (
    ((participant.kills ?? 0) + (participant.assists ?? 0)) /
    Math.max(1, participant.deaths ?? 0)
  );
}

export function computeAverageKda(matches: PlayerCardMatch[]): number | null {
  if (matches.length === 0) {
    return null;
  }

  const total = matches.reduce(
    (sum, match) => sum + participantKda(match.me),
    0,
  );
  return total / matches.length;
}

function formatDecimal(value: number): string {
  return value.toFixed(1);
}

function computeAverageSoloKills(matches: PlayerCardMatch[]): number | null {
  if (matches.length === 0) {
    return null;
  }

  const total = matches.reduce(
    (sum, match) => sum + (match.me.challenges?.soloKills ?? 0),
    0,
  );
  return total / matches.length;
}

function computeResultStreak(
  matches: PlayerCardMatch[],
): { kind: "win" | "lose"; count: number } | null {
  let kind: "win" | "lose" | null = null;
  let count = 0;

  for (const match of matches) {
    const result = resolveRecentGameResult(match);
    if (result !== "Win" && result !== "Lose") {
      continue;
    }

    const nextKind = result === "Win" ? "win" : "lose";
    if (!kind) {
      kind = nextKind;
      count = 1;
      continue;
    }

    if (kind !== nextKind) {
      break;
    }

    count += 1;
  }

  return kind ? { kind, count } : null;
}

function flashSlotFromSpells(
  spell1Id: number | null | undefined,
  spell2Id: number | null | undefined,
): "spell1" | "spell2" | null {
  if (spell1Id === FLASH_SPELL_ID) {
    return "spell1";
  }

  if (spell2Id === FLASH_SPELL_ID) {
    return "spell2";
  }

  return null;
}

function hasOffFlashPosition(
  slot: PlayerSlot,
  matches: PlayerCardMatch[],
): boolean {
  const currentFlashSlot = flashSlotFromSpells(slot.spell1Id, slot.spell2Id);
  if (!currentFlashSlot) {
    return false;
  }

  for (const match of matches) {
    const previousFlashSlot = flashSlotFromSpells(
      match.me.spell1Id,
      match.me.spell2Id,
    );
    if (!previousFlashSlot) {
      continue;
    }

    return previousFlashSlot !== currentFlashSlot;
  }

  return false;
}

export function hasEncounteredPlayer(
  ownMatches: RawMatchSummaryGame[] | undefined,
  targetPuuid: string | undefined,
): boolean {
  if (!ownMatches || !targetPuuid) {
    return false;
  }

  return ownMatches.some((match) =>
    match.json.participants.some(
      (participant) => participant.puuid === targetPuuid,
    ),
  );
}

export const PLAYER_CARD_MATCH_TAGS = [
  {
    id: "winStreak",
    settingLabelKey: "settings.ongoing.playerCardTags.items.winStreak",
    order: 10,
    defaultEnabled: true,
    defaultColor: "oklch(0.73 0.18 142)",
    tone: "good",
    evaluate: (matches) => {
      const streak = computeResultStreak(matches);
      return Boolean(
        streak?.kind === "win" && streak.count >= MIN_STREAK_COUNT,
      );
    },
    formatLabel: (matches, t) => {
      const count = computeResultStreak(matches)?.count ?? 0;
      return t("ongoingGame.playerTags.winStreak", {
        count,
        defaultValue: "{{count}} wins",
      });
    },
  },
  {
    id: "loseStreak",
    settingLabelKey: "settings.ongoing.playerCardTags.items.loseStreak",
    order: 20,
    defaultEnabled: true,
    defaultColor: "oklch(0.65 0.25 27)",
    tone: "bad",
    evaluate: (matches) => {
      const streak = computeResultStreak(matches);
      return Boolean(
        streak?.kind === "lose" && streak.count >= MIN_STREAK_COUNT,
      );
    },
    formatLabel: (matches, t) => {
      const count = computeResultStreak(matches)?.count ?? 0;
      return t("ongoingGame.playerTags.loseStreak", {
        count,
        defaultValue: "{{count}} losses",
      });
    },
  },
  {
    id: "averageSoloKills",
    settingLabelKey: "settings.ongoing.playerCardTags.items.averageSoloKills",
    order: 30,
    defaultEnabled: true,
    defaultColor: DEFAULT_TAG_COLOR,
    tone: "warning",
    evaluate: (matches) => (computeAverageSoloKills(matches) ?? 0) > 0,
    formatLabel: (matches, t) => {
      const value = formatDecimal(computeAverageSoloKills(matches) ?? 0);
      return t("ongoingGame.playerTags.averageSoloKills", {
        value,
        defaultValue: "{{value}} solo kills",
      });
    },
  },
  {
    id: "excellent",
    settingLabelKey: "settings.ongoing.playerCardTags.items.excellent",
    order: 40,
    defaultEnabled: true,
    defaultColor: "oklch(0.73 0.18 142)",
    tone: "good",
    evaluate: (matches) =>
      (computeAverageKda(matches) ?? 0) >= EXCELLENT_AVERAGE_KDA,
    formatLabel: (_matches, t) =>
      t("ongoingGame.playerTags.excellent", {
        defaultValue: "Excellent",
      }),
  },
] as const satisfies PlayerCardMatchTagDefinition[];

export const PLAYER_CARD_SPECIAL_TAGS = [
  {
    id: "self",
    settingLabelKey: "settings.ongoing.playerCardTags.items.self",
    cardLabelKey: "ongoingGame.playerTags.self",
    order: 0,
    defaultEnabled: true,
    defaultColor: DEFAULT_TAG_COLOR,
    tone: "self",
  },
  {
    id: "offFlashPosition",
    settingLabelKey: "settings.ongoing.playerCardTags.items.offFlashPosition",
    cardLabelKey: "ongoingGame.playerTags.offFlashPosition",
    order: 50,
    defaultEnabled: true,
    defaultColor: DEFAULT_TAG_COLOR,
    tone: "warning",
  },
  {
    id: "hiddenCareer",
    settingLabelKey: "settings.ongoing.playerCardTags.items.hiddenCareer",
    cardLabelKey: "ongoingGame.playerTags.hiddenCareer",
    order: 60,
    defaultEnabled: true,
    defaultColor: "oklch(0.65 0.25 27)",
    tone: "bad",
  },

  {
    id: "encountered",
    settingLabelKey: "settings.ongoing.playerCardTags.items.encountered",
    cardLabelKey: "ongoingGame.playerTags.encountered",
    order: 80,
    defaultEnabled: true,
    defaultColor: "oklch(0.72 0.11 245)",
    tone: "info",
  },
] as const satisfies PlayerCardSpecialTagDefinition[];

const ALL_TAG_DEFINITIONS = [
  ...PLAYER_CARD_MATCH_TAGS,
  ...PLAYER_CARD_SPECIAL_TAGS,
];

const KNOWN_TAG_IDS: ReadonlySet<string> = new Set(
  ALL_TAG_DEFINITIONS.map((tag) => tag.id),
);
const DEFAULT_ENABLED_PLAYER_CARD_TAG_IDS = ALL_TAG_DEFINITIONS.filter(
  (tag) => tag.defaultEnabled,
).map((tag) => tag.id);
const DEFAULT_PLAYER_CARD_TAG_COLORS = Object.fromEntries(
  ALL_TAG_DEFINITIONS.map((tag) => [tag.id, tag.defaultColor]),
);

export function getDefaultEnabledPlayerCardTagIds(): string[] {
  return [...DEFAULT_ENABLED_PLAYER_CARD_TAG_IDS];
}

export function normalizeEnabledPlayerCardTagIds(
  value: unknown,
): readonly string[] {
  if (!Array.isArray(value)) {
    return DEFAULT_ENABLED_PLAYER_CARD_TAG_IDS;
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawId of value) {
    if (typeof rawId !== "string" || !KNOWN_TAG_IDS.has(rawId)) {
      continue;
    }

    if (!seen.has(rawId)) {
      seen.add(rawId);
      result.push(rawId);
    }
  }

  if (
    result.length === value.length &&
    result.every((id, index) => id === value[index])
  ) {
    return value as string[];
  }

  return result;
}

export function getDefaultPlayerCardTagColors(): Record<string, string> {
  return { ...DEFAULT_PLAYER_CARD_TAG_COLORS };
}

export function normalizePlayerCardTagColors(
  value: unknown,
): Readonly<Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PLAYER_CARD_TAG_COLORS;
  }

  const rawColors = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  let changed = false;

  for (const tag of ALL_TAG_DEFINITIONS) {
    const rawColor = rawColors[tag.id];
    if (rawColor === undefined) {
      continue;
    }

    if (isPlayerCardTagColor(rawColor)) {
      result[tag.id] = rawColor;
    } else {
      changed = true;
    }
  }

  const rawKeys = Object.keys(rawColors);
  if (
    !changed &&
    rawKeys.length === Object.keys(result).length &&
    rawKeys.every((id) => result[id] === rawColors[id])
  ) {
    return rawColors as Record<string, string>;
  }

  return result;
}

export function getPlayerCardTagColor(
  id: string,
  colors: Readonly<Record<string, string>>,
): string {
  const configured = colors[id];
  if (isPlayerCardTagColor(configured)) {
    return configured;
  }

  const definition = ALL_TAG_DEFINITIONS.find((tag) => tag.id === id);
  return definition?.defaultColor ?? DEFAULT_TAG_COLOR;
}

export function getPlayerCardTagSettingItems(
  t: TFunction,
): PlayerCardTagSettingItem[] {
  return ALL_TAG_DEFINITIONS.map((tag) => ({
    id: tag.id,
    label: t(tag.settingLabelKey),
    order: tag.order,
    defaultEnabled: tag.defaultEnabled,
  })).sort((left, right) => left.order - right.order);
}

export function collectMatchPlayerCardTags(
  matches: PlayerCardMatch[],
  enabledIds: readonly string[],
  colors: Readonly<Record<string, string>>,
  t: TFunction,
): ResolvedPlayerCardTag[] {
  const enabled = new Set(enabledIds);

  return PLAYER_CARD_MATCH_TAGS.filter(
    (tag) => enabled.has(tag.id) && tag.evaluate(matches),
  ).map((tag) => ({
    color: getPlayerCardTagColor(tag.id, colors),
    id: tag.id,
    order: tag.order,
    text: tag.formatLabel(matches, t),
    tone: tag.tone,
  }));
}

export function collectSpecialPlayerCardTags(params: {
  colors: Readonly<Record<string, string>>;
  enabledIds: readonly string[];
  hasHistoryLoadFailed: boolean;
  isSelf: boolean;
  recentGames: PlayerCardMatch[];
  slot: PlayerSlot;
  t: TFunction;
  wasEncountered: boolean;
}): ResolvedPlayerCardTag[] {
  const {
    enabledIds,
    colors,
    hasHistoryLoadFailed,
    isSelf,
    recentGames,
    slot,
    t,
    wasEncountered,
  } = params;
  const enabled = new Set(enabledIds);
  const result: ResolvedPlayerCardTag[] = [];

  for (const tag of PLAYER_CARD_SPECIAL_TAGS) {
    if (!enabled.has(tag.id)) {
      continue;
    }

    const matched =
      (tag.id === "offFlashPosition" &&
        hasOffFlashPosition(slot, recentGames)) ||
      (tag.id === "hiddenCareer" && hasHistoryLoadFailed) ||
      (tag.id === "self" && isSelf) ||
      (tag.id === "encountered" && wasEncountered);

    if (!matched) {
      continue;
    }

    result.push({
      color: getPlayerCardTagColor(tag.id, colors),
      id: tag.id,
      order: tag.order,
      text: t(tag.cardLabelKey),
      tone: tag.tone,
    });
  }

  return result;
}

export function sortPlayerCardTags(
  tags: ResolvedPlayerCardTag[],
): ResolvedPlayerCardTag[] {
  return [...tags].sort((left, right) => left.order - right.order);
}
