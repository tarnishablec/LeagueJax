import type { TFunction } from "i18next";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { resolveRecentGameResult } from "../routes/ongoing-game.history-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import type { PlayerSquadAssignment } from "./player-card-squads.ts";

const FLASH_SPELL_ID = 4;
const MIN_STREAK_COUNT = 3;
const DEFAULT_TAG_COLOR = "#F58200";
const PLAYER_CARD_SQUAD_TAG_ID = "squad";
export const DEFAULT_EXCELLENT_KDA_THRESHOLD = 6;
export const EXCELLENT_KDA_THRESHOLD_SETTING_ID =
  "ongoing.playerCardTags.excellentKdaThreshold" as const;
export type PlayerCardTagGroupKey = `ongoing.playerCardTags.${string}`;
export type PlayerCardTagColorSettingId = `${PlayerCardTagGroupKey}.color`;
export type PlayerCardTagEnabledSettingId = `${PlayerCardTagGroupKey}.enabled`;

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
  evaluate: (
    matches: PlayerCardMatch[],
    slot: PlayerSlot,
    excellentKdaThreshold: number,
  ) => boolean;
  formatLabel: (
    matches: PlayerCardMatch[],
    slot: PlayerSlot,
  ) => PlayerCardTagLabel;
};

type PlayerCardTagLabel = {
  key: string;
  options?: Record<string, unknown>;
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
  colorSettings: PlayerCardTagColorSettingItem[];
  colorSettingId?: PlayerCardTagColorSettingId;
  defaultColor: string;
  enabledSettingId: PlayerCardTagEnabledSettingId;
  groupKey: PlayerCardTagGroupKey;
  id: string;
  label: string;
  order: number;
  defaultEnabled: boolean;
};

export type PlayerCardTagEnabledSettingItem = {
  defaultEnabled: boolean;
  id: PlayerCardTagEnabledSettingId;
  labelKey: string;
  order: number;
  tagId: string;
};

export type PlayerCardTagColorSettingItem = {
  defaultColor: string;
  id: PlayerCardTagColorSettingId;
  labelKey: string;
  order: number;
  tagId: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
): { r: number; g: number; b: number; alpha: string | null } | null {
  const normalized = value.trim();
  const match = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(normalized);
  if (!match) {
    return null;
  }

  const hex = match[1];
  const alpha = match[2] ?? null;
  return {
    alpha,
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

export function oklchColorToHex(value: string): string {
  const rgb = parseHexColor(value);
  if (rgb) {
    return `#${formatHexChannel(rgb.r)}${formatHexChannel(rgb.g)}${formatHexChannel(rgb.b)}${rgb.alpha?.toUpperCase() ?? ""}`;
  }

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

export function isPlayerCardTagColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (parseHexColor(value) !== null || parseOklchColor(value) !== null)
  );
}

export function normalizePlayerCardTagColor(
  value: unknown,
  fallback: string,
): string {
  return isPlayerCardTagColor(value) ? value : fallback;
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
    defaultColor: "#5BC352",
    tone: "good",
    evaluate: (matches, _slot, _excellentKdaThreshold) => {
      const streak = computeResultStreak(matches);
      return Boolean(
        streak?.kind === "win" && streak.count >= MIN_STREAK_COUNT,
      );
    },
    formatLabel: (matches, _slot) => {
      const count = computeResultStreak(matches)?.count ?? 0;
      return {
        key: "ongoingGame.playerTags.winStreak",
        options: {
          count,
          defaultValue: "{{count}} wins",
        },
      };
    },
  },
  {
    id: "loseStreak",
    settingLabelKey: "settings.ongoing.playerCardTags.items.loseStreak",
    order: 20,
    defaultEnabled: true,
    defaultColor: "#FF252B",
    tone: "bad",
    evaluate: (matches, _slot, _excellentKdaThreshold) => {
      const streak = computeResultStreak(matches);
      return Boolean(
        streak?.kind === "lose" && streak.count >= MIN_STREAK_COUNT,
      );
    },
    formatLabel: (matches, _slot) => {
      const count = computeResultStreak(matches)?.count ?? 0;
      return {
        key: "ongoingGame.playerTags.loseStreak",
        options: {
          count,
          defaultValue: "{{count}} losses",
        },
      };
    },
  },
  {
    id: "averageSoloKills",
    settingLabelKey: "settings.ongoing.playerCardTags.items.averageSoloKills",
    order: 30,
    defaultEnabled: true,
    defaultColor: "#ff0057",
    tone: "warning",
    evaluate: (matches, _slot, _excellentKdaThreshold) =>
      (computeAverageSoloKills(matches) ?? 0) > 0,
    formatLabel: (matches, _slot) => {
      const value = formatDecimal(computeAverageSoloKills(matches) ?? 0);
      return {
        key: "ongoingGame.playerTags.averageSoloKills",
        options: {
          value,
          defaultValue: "{{value}} solo kills",
        },
      };
    },
  },
  {
    id: "excellent",
    settingLabelKey: "settings.ongoing.playerCardTags.items.excellent",
    order: 40,
    defaultEnabled: true,
    defaultColor: "#DB18AE",
    tone: "good",
    evaluate: (matches, _slot, excellentKdaThreshold) =>
      (computeAverageKda(matches) ?? 0) >= excellentKdaThreshold,
    formatLabel: (_matches, _slot) => ({
      key: "ongoingGame.playerTags.excellent",
      options: {
        defaultValue: "Excellent",
      },
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
    defaultColor: "#8B00F5",
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
    defaultColor: "#253EFF",
    tone: "bad",
  },

  {
    id: "encountered",
    settingLabelKey: "settings.ongoing.playerCardTags.items.encountered",
    cardLabelKey: "ongoingGame.playerTags.encountered",
    order: 80,
    defaultEnabled: true,
    defaultColor: "#66ABE5",
    tone: "info",
  },
] as const satisfies PlayerCardSpecialTagDefinition[];

const SINGLE_COLOR_TAG_DEFINITIONS = [
  ...PLAYER_CARD_MATCH_TAGS,
  ...PLAYER_CARD_SPECIAL_TAGS,
];

export function getPlayerCardTagGroupKey(tagId: string): PlayerCardTagGroupKey {
  return `ongoing.playerCardTags.${tagId}`;
}

export function getPlayerCardTagEnabledSettingId(
  tagId: string,
): PlayerCardTagEnabledSettingId {
  return `${getPlayerCardTagGroupKey(tagId)}.enabled`;
}

export function getPlayerCardTagColorSettingId(
  tagId: string,
): PlayerCardTagColorSettingId {
  return `${getPlayerCardTagGroupKey(tagId)}.color`;
}

export function getPlayerCardTagEnabledSettingItems(): PlayerCardTagEnabledSettingItem[] {
  return SINGLE_COLOR_TAG_DEFINITIONS.map((tag) => ({
    defaultEnabled: tag.defaultEnabled,
    id: getPlayerCardTagEnabledSettingId(tag.id),
    labelKey: tag.settingLabelKey,
    order: tag.order,
    tagId: tag.id,
  }));
}

export function getPlayerCardTagColorSettingItems(): PlayerCardTagColorSettingItem[] {
  return SINGLE_COLOR_TAG_DEFINITIONS.map((tag) => ({
    defaultColor: tag.defaultColor,
    id: getPlayerCardTagColorSettingId(tag.id),
    labelKey: tag.settingLabelKey,
    order: 100 + tag.order,
    tagId: tag.id,
  }));
}

const DEFAULT_PLAYER_CARD_TAG_COLORS = Object.fromEntries(
  getPlayerCardTagColorSettingItems().map((item) => [
    item.tagId,
    item.defaultColor,
  ]),
);

export function getPlayerCardTagColor(
  id: string,
  colors: Readonly<Record<string, string>>,
): string {
  const configured = colors[id];
  if (isPlayerCardTagColor(configured)) {
    return configured;
  }

  return DEFAULT_PLAYER_CARD_TAG_COLORS[id] ?? DEFAULT_TAG_COLOR;
}

export function getPlayerCardTagSettingItems(
  t: TFunction,
): PlayerCardTagSettingItem[] {
  return SINGLE_COLOR_TAG_DEFINITIONS.map((tag) => {
    const colorSettings = getPlayerCardTagColorSettingItems().filter(
      (item) => item.tagId === tag.id,
    );
    const firstColorSetting = colorSettings[0];

    return {
      colorSettings,
      colorSettingId: firstColorSetting?.id,
      defaultColor: firstColorSetting?.defaultColor ?? DEFAULT_TAG_COLOR,
      enabledSettingId: getPlayerCardTagEnabledSettingId(tag.id),
      groupKey: getPlayerCardTagGroupKey(tag.id),
      id: tag.id,
      label: t(tag.settingLabelKey),
      order: tag.order,
      defaultEnabled: tag.defaultEnabled,
    };
  }).sort((left, right) => left.order - right.order);
}

export function collectMatchPlayerCardTags(
  matches: PlayerCardMatch[],
  enabledIds: readonly string[],
  colors: Readonly<Record<string, string>>,
  slot: PlayerSlot,
  excellentKdaThreshold: number,
  t: TFunction,
): ResolvedPlayerCardTag[] {
  const enabled = new Set(enabledIds);

  return PLAYER_CARD_MATCH_TAGS.filter(
    (tag) =>
      enabled.has(tag.id) && tag.evaluate(matches, slot, excellentKdaThreshold),
  ).map((tag) => {
    const label = tag.formatLabel(matches, slot);

    return {
      color: getPlayerCardTagColor(tag.id, colors),
      id: tag.id,
      order: tag.order,
      text: t(label.key, label.options),
      tone: tag.tone,
    };
  });
}

export function collectSquadPlayerCardTags(params: {
  assignment: PlayerSquadAssignment | undefined;
  t: TFunction;
}): ResolvedPlayerCardTag[] {
  const { assignment, t } = params;
  if (!assignment) {
    return [];
  }

  return [
    {
      color: assignment.color,
      id: `${PLAYER_CARD_SQUAD_TAG_ID}:${assignment.number}`,
      order: assignment.number,
      text: t("ongoingGame.playerTags.squad", {
        number: assignment.number,
        defaultValue: "Squad {{number}}",
      }),
      tone: "info",
    },
  ];
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
