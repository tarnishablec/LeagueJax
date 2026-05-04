import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import { normalizeCdragonLocale } from "@/utils/cdragon-locale";

type CdragonPerk = {
  id?: number | string;
  name?: string;
  tooltip?: string;
  shortDesc?: string;
  longDesc?: string;
  recommendationDescriptor?: string;
  iconPath?: string;
  endOfGameStatDescs?: string[];
};

type CdragonPerkStyleSlot = {
  type?: string;
  slotLabel?: string;
  perks?: string;
};

type CdragonPerkStyle = {
  id?: number | string;
  name?: string;
  tooltip?: string;
  iconPath?: string;
  slots?: CdragonPerkStyleSlot[];
};

type CdragonPerkStyleCollection = {
  styles?: CdragonPerkStyle[];
};

type CdragonAugment = {
  id?: number | string;
  nameTRA?: string;
  simpleNameTRA?: string;
  augmentSmallIconPath?: string;
  rarity?: string | number;
  description?: string;
  tooltip?: string;
  summary?: string;
  dataValues?: Record<string, unknown>;
  augmentNameId?: string;
};

type CdragonLolStringTable = {
  entries?: Record<string, string>;
};

type CdragonModeSpecificDataValue = {
  name?: string;
  mName?: string;
  values?: Array<number | null>;
  mValues?: Array<number | null>;
};

type CdragonModeSpecificSpellObject = {
  mSpell?: {
    DataValues?: CdragonModeSpecificDataValue[];
  };
};

type CdragonModeSpecificAugment = {
  AugmentNameId?: string;
  NameTra?: string;
  DescriptionTra?: string;
  AugmentTooltipTra?: string;
  RootSpell?: string;
  AugmentSmallIconPath?: string;
  rarity?: string | number;
  AugmentPlatformId?: string | number;
};

type CdragonModeSpecificBinJson = Record<
  string,
  | CdragonModeSpecificAugment
  | CdragonModeSpecificSpellObject
  | Record<string, unknown>
>;

type CdragonArenaAugment = {
  id?: number | string;
  name?: string;
  desc?: string;
  tooltip?: string;
  rarity?: string | number;
  augmentSmallIconPath?: string;
  iconPath?: string;
  iconSmall?: string;
  iconLarge?: string;
  dataValues?: Record<string, unknown>;
  calculations?: Record<string, unknown>;
  apiName?: string;
};

type CdragonArenaJson = {
  augments?: CdragonArenaAugment[];
};

export type CdragonGameDataCatalogPerk = CdragonPerk & {
  id: number;
};

export type CdragonGameDataCatalogPerkStyle = CdragonPerkStyle & {
  id: number;
};

export type CdragonGameDataCatalogAugment = CdragonAugment & {
  id: number;
  rarity?: string;
};

export type CdragonGameDataCatalog = {
  perksById: Record<number, CdragonGameDataCatalogPerk>;
  perkStylesById: Record<number, CdragonGameDataCatalogPerkStyle>;
  augmentsById: Record<number, CdragonGameDataCatalogAugment>;
};

type CdragonAugmentGameMode = "CHERRY" | "KIWI";

const CDRAGON_GAME_DATA_ROOT =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global";
const CDRAGON_GAME_DATA_ASSET_BASE = `${CDRAGON_GAME_DATA_ROOT}/default`;
const CDRAGON_GAME_ASSET_BASE = "https://raw.communitydragon.org/latest/game";
const CDRAGON_ARENA_AUGMENT_COMMAND = "get_cdragon_arena_json";
const CDRAGON_CHERRY_AUGMENTS_COMMAND = "get_cdragon_cherry_augments_json";
const CDRAGON_KIWI_AUGMENT_COMMAND = "get_cdragon_kiwi_json";

const EMPTY_GAME_DATA_CATALOG: CdragonGameDataCatalog = {
  perksById: {},
  perkStylesById: {},
  augmentsById: {},
};
const EMPTY_PERKS_BY_ID = EMPTY_GAME_DATA_CATALOG.perksById;
const EMPTY_PERK_STYLES_BY_ID = EMPTY_GAME_DATA_CATALOG.perkStylesById;
const EMPTY_AUGMENTS_BY_ID = EMPTY_GAME_DATA_CATALOG.augmentsById;
const UNRESOLVED_AUGMENT_VALUE = "--";

function cdragonGameDataBase(locale: string): string {
  return `${CDRAGON_GAME_DATA_ROOT}/${locale}`;
}

function cdragonGameDataLocalePath(locale: string): string {
  return locale === "default" || locale === "en_us" ? "en_gb" : locale;
}

function normalizeAugmentGameMode(
  gameMode: string | null | undefined,
): CdragonAugmentGameMode | null {
  const normalized = gameMode?.trim().toUpperCase();
  switch (normalized) {
    case "CHERRY":
    case "KIWI":
      return normalized;
    default:
      return null;
  }
}

async function fetchJsonByUrl<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchLocalizedJson<T>(
  locale: string,
  fileName: string,
): Promise<T | null> {
  const localePath = cdragonGameDataLocalePath(locale);
  const localized = await fetchJsonByUrl<T>(
    `${cdragonGameDataBase(localePath)}/v1/${fileName}`,
  );
  if (localized !== null || localePath === "en_gb") {
    return localized;
  }

  return fetchJsonByUrl<T>(`${cdragonGameDataBase("en_gb")}/v1/${fileName}`);
}

async function fetchCachedCdragonJson<T>(
  command: string,
  enabled: boolean,
  locale: string,
): Promise<T | null> {
  if (!enabled) {
    return null;
  }

  try {
    return await invoke<T>(command, {
      forceRefresh: false,
      locale,
    });
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match: string, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replace(/&#(\d+);/g, (_match: string, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cdragonTextToPlainText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const withoutTags = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(withoutTags)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stringTableEntries(
  stringTable: CdragonLolStringTable | Record<string, string> | null,
): Record<string, string> {
  if (!stringTable) {
    return {};
  }

  const rawEntries = isRecord(stringTable.entries)
    ? stringTable.entries
    : stringTable;
  const entries: Record<string, string> = {};

  for (const [key, value] of Object.entries(rawEntries)) {
    if (typeof value === "string") {
      entries[key.toLowerCase()] = value;
    }
  }

  return entries;
}

function stringTableValue(
  entries: Record<string, string>,
  key: string | null | undefined,
): string | null {
  const normalizedKey = key?.trim().toLowerCase();
  if (!normalizedKey) {
    return null;
  }

  return entries[normalizedKey] ?? null;
}

function augmentRarityToCdragonRarity(
  rarity: string | number | null | undefined,
): string | undefined {
  if (typeof rarity === "string") {
    switch (rarity) {
      case "kPrismatic":
      case "kGold":
      case "kSilver":
      case "kBronze":
        return rarity;
      default:
        break;
    }
  }

  const rarityId = asNumber(rarity);
  switch (rarityId) {
    case 4:
    case 2:
      return "kPrismatic";
    case 1:
      return "kGold";
    case 0:
      return "kSilver";
    case 3:
      return "kBronze";
    default:
      return undefined;
  }
}

function finiteDataValue(
  values: Array<number | null> | undefined,
): number | null {
  const finiteValues = (values ?? []).filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
  return finiteValues.find((value) => value !== 0) ?? finiteValues[0] ?? null;
}

function modeSpecificObjectByKey(
  modeSpecificData: CdragonModeSpecificBinJson,
  key: string | null | undefined,
): unknown {
  const normalizedKey = key?.trim();
  if (!normalizedKey) {
    return null;
  }

  return (
    modeSpecificData[normalizedKey] ??
    modeSpecificData[normalizedKey.toLowerCase()] ??
    Object.entries(modeSpecificData).find(
      ([entryKey]) => entryKey.toLowerCase() === normalizedKey.toLowerCase(),
    )?.[1] ??
    null
  );
}

function modeSpecificDataValueName(dataValue: Record<string, unknown>): string {
  const name = dataValue.mName ?? dataValue.name;
  return typeof name === "string" ? name.trim() : "";
}

function modeSpecificDataValueNumbers(
  dataValue: Record<string, unknown>,
): Array<number | null> {
  const values = dataValue.mValues ?? dataValue.values;
  return Array.isArray(values) ? values : [];
}

function modeSpecificDataValues(
  modeSpecificData: CdragonModeSpecificBinJson,
  rootSpell: string | null | undefined,
): Record<string, number> {
  const spellObject = modeSpecificObjectByKey(modeSpecificData, rootSpell);
  if (!isRecord(spellObject) || !isRecord(spellObject.mSpell)) {
    return {};
  }

  const dataValues = spellObject.mSpell.DataValues;
  if (!Array.isArray(dataValues)) {
    return {};
  }

  const mapped: Record<string, number> = {};
  for (const dataValue of dataValues) {
    if (!isRecord(dataValue)) {
      continue;
    }

    const name = modeSpecificDataValueName(dataValue);
    const value = finiteDataValue(modeSpecificDataValueNumbers(dataValue));

    if (name.length > 0 && value !== null) {
      mapped[name.toLowerCase()] = value;
    }
  }

  return mapped;
}

function augmentVariableKey(token: string): string | null {
  const expression =
    token
      .trim()
      .split(/[+\-*/]/)[0]
      ?.trim() ?? "";
  const key = expression.includes(":")
    ? expression.split(":").pop()?.trim()
    : expression;

  if (!key || /^f\d+$/i.test(key) || /^spellmodifierdescription/i.test(key)) {
    return null;
  }

  return key.toLowerCase();
}

function augmentVariableMultiplier(token: string): number {
  const multiplier = token.match(/\*\s*(-?\d+(?:\.\d+)?)/)?.[1];
  const parsed = multiplier ? Number(multiplier) : 1;
  return Number.isFinite(parsed) ? parsed : 1;
}

function formatAugmentVariableValue(value: number): string {
  const normalized = Math.abs(value) < 0.0001 ? 0 : value;
  return normalized.toFixed(3).replace(/\.?0+$/, "");
}

function replaceAugmentVariables(
  value: string,
  dataValues: Record<string, number>,
  options: { unresolvedValue?: string } = {},
): string {
  return value.replace(/@([^@]+)@/g, (match: string, token: string) => {
    const key = augmentVariableKey(token);
    if (!key) {
      return "";
    }

    const dataValue = dataValues[key];
    if (typeof dataValue !== "number") {
      return options.unresolvedValue ?? match;
    }

    return formatAugmentVariableValue(
      dataValue * augmentVariableMultiplier(token),
    );
  });
}

function cleanAugmentDescription(value: string): string {
  return cdragonTextToPlainText(value)
    .replace(/%i:[^%]+%/gi, "")
    .replace(/\{\{\s*[^}]+\s*}}/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/@[^@]+@/.test(line))
    .filter((line) => !line.endsWith(":"))
    .filter((line) => !/[：:]$/.test(line))
    .join("\n");
}

function normalizeArenaAugmentDataValues(
  dataValues: Record<string, unknown> | undefined,
): Record<string, number> {
  const mapped: Record<string, number> = {};

  for (const [key, value] of Object.entries(dataValues ?? {})) {
    const name = key.trim().toLowerCase();
    const numberValue = arenaAugmentDataValueNumber(value);

    if (name.length > 0 && numberValue !== null) {
      mapped[name] = numberValue;
    }
  }

  return mapped;
}

function arenaAugmentDataValueNumber(value: unknown): number | null {
  const direct = asNumber(value);
  if (direct !== null) {
    return direct;
  }

  if (Array.isArray(value)) {
    return finiteDataValue(value.map((entry) => asNumber(entry)));
  }

  if (isRecord(value)) {
    const singleValue = asNumber(value.value ?? value.mValue);
    if (singleValue !== null) {
      return singleValue;
    }

    const values = value.values ?? value.mValues;
    if (Array.isArray(values)) {
      return finiteDataValue(values.map((entry) => asNumber(entry)));
    }
  }

  return null;
}

function normalizeArenaAugmentValues(
  entry: CdragonArenaAugment,
): Record<string, number> {
  const dataValues = normalizeArenaAugmentDataValues(entry.dataValues);
  const calculationValues = normalizeArenaAugmentStaticCalculations(
    entry.calculations,
    dataValues,
  );

  return {
    ...dataValues,
    ...calculationValues,
  };
}

function normalizeArenaAugmentStaticCalculations(
  calculations: Record<string, unknown> | undefined,
  dataValues: Record<string, number>,
): Record<string, number> {
  const mapped: Record<string, number> = {};

  for (const [key, calculation] of Object.entries(calculations ?? {})) {
    const name = key.trim().toLowerCase();
    const value = arenaStaticCalculationValue(calculation, dataValues);

    if (name.length > 0 && value !== null) {
      mapped[name] = value;
    }
  }

  return mapped;
}

function arenaStaticCalculationValue(
  calculation: unknown,
  dataValues: Record<string, number>,
): number | null {
  if (!isRecord(calculation)) {
    return null;
  }

  const formulaParts = calculation.mFormulaParts;
  if (!Array.isArray(formulaParts) || formulaParts.length !== 1) {
    return null;
  }

  const [formulaPart] = formulaParts;
  if (!isRecord(formulaPart)) {
    return null;
  }

  const baseValue = arenaStaticCalculationPartValue(formulaPart, dataValues);
  if (baseValue === null) {
    return null;
  }

  const multiplier = arenaCalculationMultiplier(calculation.mMultiplier);
  if (multiplier === null) {
    return null;
  }

  const precision = asNumber(calculation.mPrecision);
  return applyArenaCalculationPrecision(baseValue * multiplier, precision);
}

function arenaStaticCalculationPartValue(
  formulaPart: Record<string, unknown>,
  dataValues: Record<string, number>,
): number | null {
  const type = firstStringValue(formulaPart.__type);

  if (type === "NamedDataValueCalculationPart") {
    const dataValueName = firstStringValue(formulaPart.mDataValue);
    if (!dataValueName) {
      return null;
    }

    return dataValues[dataValueName.toLowerCase()] ?? null;
  }

  return null;
}

function arenaCalculationMultiplier(value: unknown): number | null {
  if (value === undefined) {
    return 1;
  }

  if (!isRecord(value)) {
    return null;
  }

  const type = firstStringValue(value.__type);
  if (type !== "NumberCalculationPart") {
    return null;
  }

  return asNumber(value.mNumber);
}

function applyArenaCalculationPrecision(
  value: number,
  precision: number | null,
): number {
  if (precision === null || precision < 0) {
    return value;
  }

  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}

function resolveArenaAugmentText(
  value: string | null | undefined,
  dataValues: Record<string, number>,
): string {
  if (!value) {
    return "";
  }

  return cleanAugmentDescription(
    replaceAugmentVariables(value, dataValues, {
      unresolvedValue: UNRESOLVED_AUGMENT_VALUE,
    }),
  );
}

function resolveAugmentText(
  entries: Record<string, string>,
  key: string | null | undefined,
  dataValues: Record<string, number>,
): string {
  const raw = stringTableValue(entries, key);
  if (!raw) {
    return "";
  }

  return cleanAugmentDescription(replaceAugmentVariables(raw, dataValues));
}

function looksLikeModeSpecificAugment(
  value: unknown,
): value is CdragonModeSpecificAugment {
  return (
    isRecord(value) &&
    (value.AugmentPlatformId !== undefined ||
      value.NameTra !== undefined ||
      value.RootSpell !== undefined)
  );
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function collectionEntries<T>(
  collection: T[] | Record<string, T> | null,
): Array<[number | null, T]> {
  if (Array.isArray(collection)) {
    return collection.map((entry) => [null, entry]);
  }
  if (collection) {
    return Object.entries(collection).map(([key, entry]) => [
      asNumber(key),
      entry,
    ]);
  }

  return [];
}

function firstStringValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return undefined;
}

function mapPerksById(
  collection: CdragonPerk[] | Record<string, CdragonPerk> | null,
): Record<number, CdragonGameDataCatalogPerk> {
  const mapped: Record<number, CdragonGameDataCatalogPerk> = {};

  for (const [idFromKey, entry] of collectionEntries(collection)) {
    const id = asNumber(entry.id) ?? idFromKey;
    if (id === null) {
      continue;
    }
    mapped[id] = { ...entry, id };
  }

  return mapped;
}

function mapPerkStylesById(
  collection: CdragonPerkStyleCollection | null,
): Record<number, CdragonGameDataCatalogPerkStyle> {
  const mapped: Record<number, CdragonGameDataCatalogPerkStyle> = {};

  for (const entry of collection?.styles ?? []) {
    const id = asNumber(entry.id);
    if (id === null) {
      continue;
    }
    mapped[id] = { ...entry, id };
  }

  return mapped;
}

function mapAugmentsById(
  collection: CdragonAugment[] | Record<string, CdragonAugment> | null,
): Record<number, CdragonGameDataCatalogAugment> {
  const mapped: Record<number, CdragonGameDataCatalogAugment> = {};

  for (const [idFromKey, entry] of collectionEntries(collection)) {
    const id = asNumber(entry.id) ?? idFromKey;
    if (id === null) {
      continue;
    }
    mapped[id] = {
      ...entry,
      id,
      rarity: augmentRarityToCdragonRarity(entry.rarity),
    };
  }

  return mapped;
}

function mapArenaAugmentsById(
  arenaData: CdragonArenaJson | null,
): Record<number, CdragonGameDataCatalogAugment> {
  const mapped: Record<number, CdragonGameDataCatalogAugment> = {};

  for (const entry of arenaData?.augments ?? []) {
    const id = asNumber(entry.id);
    if (id === null) {
      continue;
    }

    const name = firstStringValue(entry.name);
    const augmentValues = normalizeArenaAugmentValues(entry);
    const description = resolveArenaAugmentText(entry.desc, augmentValues);
    const tooltip =
      resolveArenaAugmentText(entry.tooltip, augmentValues) || description;
    const mappedAugment: CdragonGameDataCatalogAugment = {
      id,
      augmentSmallIconPath: firstStringValue(
        entry.augmentSmallIconPath,
        entry.iconSmall,
        entry.iconLarge,
        entry.iconPath,
      ),
      rarity: augmentRarityToCdragonRarity(entry.rarity),
      description,
      tooltip,
      summary: description,
      dataValues: augmentValues,
      augmentNameId: entry.apiName,
    };

    if (name) {
      mappedAugment.nameTRA = name;
      mappedAugment.simpleNameTRA = name;
    }

    mapped[id] = mappedAugment;
  }

  return mapped;
}

function mapModeSpecificAugmentsById(
  modeSpecificData: CdragonModeSpecificBinJson | null,
  stringTable: CdragonLolStringTable | Record<string, string> | null,
): Record<number, CdragonGameDataCatalogAugment> {
  if (!modeSpecificData) {
    return {};
  }

  const entries = stringTableEntries(stringTable);
  const mapped: Record<number, CdragonGameDataCatalogAugment> = {};

  for (const entry of Object.values(modeSpecificData)) {
    if (!looksLikeModeSpecificAugment(entry)) {
      continue;
    }

    const id = asNumber(entry.AugmentPlatformId);
    if (id === null) {
      continue;
    }

    const dataValues = modeSpecificDataValues(
      modeSpecificData,
      entry.RootSpell,
    );
    const name = resolveAugmentText(entries, entry.NameTra, dataValues);
    const tooltip = resolveAugmentText(
      entries,
      entry.AugmentTooltipTra ?? entry.DescriptionTra,
      dataValues,
    );
    const description = resolveAugmentText(
      entries,
      entry.DescriptionTra,
      dataValues,
    );

    const mappedAugment: CdragonGameDataCatalogAugment = {
      id,
      augmentSmallIconPath: entry.AugmentSmallIconPath,
      rarity: augmentRarityToCdragonRarity(entry.rarity),
      description,
      tooltip,
      summary: description,
      dataValues,
      augmentNameId: entry.AugmentNameId,
    };

    if (name.length > 0) {
      mappedAugment.nameTRA = name;
      mappedAugment.simpleNameTRA = name;
    }

    mapped[id] = mappedAugment;
  }

  return mapped;
}

async function fetchCdragonPerksById(
  locale: string,
): Promise<Record<number, CdragonGameDataCatalogPerk>> {
  const perks = await fetchLocalizedJson<
    CdragonPerk[] | Record<string, CdragonPerk>
  >(locale, "perks.json");

  return mapPerksById(perks);
}

async function fetchCdragonPerkStylesById(
  locale: string,
): Promise<Record<number, CdragonGameDataCatalogPerkStyle>> {
  const perkStyles = await fetchLocalizedJson<CdragonPerkStyleCollection>(
    locale,
    "perkstyles.json",
  );

  return mapPerkStylesById(perkStyles);
}

async function fetchBaseAugmentsById(
  locale: string,
  hasFocusedClient: boolean,
): Promise<Record<number, CdragonGameDataCatalogAugment>> {
  const cachedAugments = await fetchCachedCdragonJson<
    CdragonAugment[] | Record<string, CdragonAugment>
  >(CDRAGON_CHERRY_AUGMENTS_COMMAND, hasFocusedClient, locale);
  const augments =
    cachedAugments ??
    (await fetchLocalizedJson<
      CdragonAugment[] | Record<string, CdragonAugment>
    >(locale, "cherry-augments.json"));

  return mapAugmentsById(augments);
}

async function fetchModeSpecificAugmentsById(
  hasFocusedClient: boolean,
  locale: string,
): Promise<Record<number, CdragonGameDataCatalogAugment>> {
  const [modeSpecificData, lolStringTable] = await Promise.all([
    fetchCachedCdragonJson<CdragonModeSpecificBinJson>(
      CDRAGON_KIWI_AUGMENT_COMMAND,
      hasFocusedClient,
      locale,
    ),
    fetchCachedCdragonJson<CdragonLolStringTable>(
      "get_cdragon_lol_stringtable_json",
      hasFocusedClient,
      locale,
    ),
  ]);

  if (!modeSpecificData || !lolStringTable) {
    return {};
  }

  return mapModeSpecificAugmentsById(modeSpecificData, lolStringTable);
}

async function fetchArenaAugmentsById(
  hasFocusedClient: boolean,
  locale: string,
): Promise<Record<number, CdragonGameDataCatalogAugment>> {
  const arenaData = await fetchCachedCdragonJson<CdragonArenaJson>(
    CDRAGON_ARENA_AUGMENT_COMMAND,
    hasFocusedClient,
    locale,
  );

  return mapArenaAugmentsById(arenaData);
}

function mergeAugmentsById(
  baseAugmentsById: Record<number, CdragonGameDataCatalogAugment>,
  modeSpecificAugmentsById: Record<number, CdragonGameDataCatalogAugment>,
): Record<number, CdragonGameDataCatalogAugment> {
  const merged = { ...baseAugmentsById };

  for (const [id, modeSpecificAugment] of Object.entries(
    modeSpecificAugmentsById,
  )) {
    const augmentId = Number(id);
    const baseAugment = merged[augmentId];
    merged[augmentId] = {
      ...baseAugment,
      ...modeSpecificAugment,
      augmentSmallIconPath:
        baseAugment?.augmentSmallIconPath ??
        modeSpecificAugment.augmentSmallIconPath,
      rarity: modeSpecificAugment.rarity ?? baseAugment?.rarity,
    };
  }

  return merged;
}

export function normalizeCdragonGameAssetPath(
  iconPath: string,
  options: { lowercase?: boolean } = {},
): string {
  const normalized = iconPath.replace(/\\/g, "/");
  const path = options.lowercase ? normalized.toLowerCase() : normalized;
  if (/^assets\//i.test(path)) {
    const gameAssetPath = path
      .replace(/\.dds$/i, ".png")
      .replace(/\.tex$/i, ".png")
      .replace(/\.jpg$/i, ".png")
      .replace(/\.jpeg$/i, ".png")
      .replace(/\.webp$/i, ".png")
      .toLowerCase();
    return `${CDRAGON_GAME_ASSET_BASE}/${encodeURI(gameAssetPath)}`;
  }

  const encoded = encodeURI(
    path
      .replace(/\.dds$/i, ".png")
      .replace(/\.tex$/i, ".png")
      .replace(/\.jpg$/i, ".png")
      .replace(/\.jpeg$/i, ".png")
      .replace(/\.webp$/i, ".png"),
  );

  if (encoded.startsWith("/lol-game-data/assets")) {
    return `${CDRAGON_GAME_DATA_ASSET_BASE}${encoded.replace("/lol-game-data/assets", "")}`;
  }
  if (encoded.startsWith("/")) {
    return `${CDRAGON_GAME_DATA_ASSET_BASE}${encoded}`;
  }

  return `${CDRAGON_GAME_DATA_ASSET_BASE}/${encoded}`;
}

export function useCdragonGameDataCatalog(
  gameMode?: string | null,
  includeAugmentDetails = false,
): CdragonGameDataCatalog {
  const { i18n } = useTranslation();
  const focused = useLcuStore(selectIsFocused);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const locale = useMemo(() => normalizeCdragonLocale(language), [language]);
  const augmentGameMode = useMemo(
    () => normalizeAugmentGameMode(gameMode),
    [gameMode],
  );
  const focusedPid = focused?.pid ?? null;
  const perksKey = useMemo(
    () => ["history:cdragon-perks", locale] as const,
    [locale],
  );
  const perkStylesKey = useMemo(
    () => ["history:cdragon-perk-styles", locale] as const,
    [locale],
  );
  const baseAugmentsKey = useMemo(
    () => ["history:cdragon-base-augments", locale, focusedPid] as const,
    [locale, focusedPid],
  );
  const modeAugmentsKey = useMemo(
    () =>
      includeAugmentDetails && focusedPid !== null && augmentGameMode !== null
        ? ([
            "history:cdragon-mode-augments",
            augmentGameMode,
            locale,
            focusedPid,
          ] as const)
        : null,
    [focusedPid, augmentGameMode, locale, includeAugmentDetails],
  );

  const { data: perksById = EMPTY_PERKS_BY_ID } = useSWR(
    perksKey,
    ([, cdragonLocale]) => fetchCdragonPerksById(cdragonLocale),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      fallbackData: EMPTY_PERKS_BY_ID,
      keepPreviousData: true,
    },
  );
  const { data: perkStylesById = EMPTY_PERK_STYLES_BY_ID } = useSWR(
    perkStylesKey,
    ([, cdragonLocale]) => fetchCdragonPerkStylesById(cdragonLocale),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      fallbackData: EMPTY_PERK_STYLES_BY_ID,
      keepPreviousData: true,
    },
  );
  const { data: baseAugmentsById = EMPTY_AUGMENTS_BY_ID } = useSWR(
    baseAugmentsKey,
    ([, cdragonLocale, pid]) =>
      fetchBaseAugmentsById(cdragonLocale, pid !== null),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      fallbackData: EMPTY_AUGMENTS_BY_ID,
      keepPreviousData: true,
    },
  );
  const { data: modeSpecificAugmentsById = EMPTY_AUGMENTS_BY_ID } = useSWR(
    modeAugmentsKey,
    ([, selectedGameMode, cdragonLocale]) =>
      selectedGameMode === "CHERRY"
        ? fetchArenaAugmentsById(true, cdragonLocale)
        : fetchModeSpecificAugmentsById(true, cdragonLocale),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      fallbackData: EMPTY_AUGMENTS_BY_ID,
      keepPreviousData: true,
    },
  );

  return useMemo(
    () => ({
      perksById,
      perkStylesById,
      augmentsById: mergeAugmentsById(
        baseAugmentsById,
        modeSpecificAugmentsById,
      ),
    }),
    [perksById, perkStylesById, baseAugmentsById, modeSpecificAugmentsById],
  );
}
