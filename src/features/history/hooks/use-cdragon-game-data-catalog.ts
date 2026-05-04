import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";

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
  rarity?: string;
};

export type CdragonGameDataCatalogPerk = CdragonPerk & {
  id: number;
};

export type CdragonGameDataCatalogPerkStyle = CdragonPerkStyle & {
  id: number;
};

export type CdragonGameDataCatalogAugment = CdragonAugment & {
  id: number;
};

export type CdragonGameDataCatalog = {
  perksById: Record<number, CdragonGameDataCatalogPerk>;
  perkStylesById: Record<number, CdragonGameDataCatalogPerkStyle>;
  augmentsById: Record<number, CdragonGameDataCatalogAugment>;
};

const CDRAGON_GAME_DATA_ROOT =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global";
const CDRAGON_GAME_DATA_ASSET_BASE = `${CDRAGON_GAME_DATA_ROOT}/default`;

const EMPTY_GAME_DATA_CATALOG: CdragonGameDataCatalog = {
  perksById: {},
  perkStylesById: {},
  augmentsById: {},
};

function cdragonGameDataBase(locale: string): string {
  return `${CDRAGON_GAME_DATA_ROOT}/${locale}`;
}

function normalizeCdragonLocale(language: string | undefined): string {
  const normalized = (language ?? "").trim().toLowerCase().replace("-", "_");

  if (normalized.startsWith("zh")) {
    return "zh_cn";
  }
  if (normalized.startsWith("ja")) {
    return "ja_jp";
  }
  if (normalized.startsWith("ko")) {
    return "ko_kr";
  }
  if (normalized.startsWith("pt")) {
    return "pt_br";
  }
  if (normalized.startsWith("es_mx")) {
    return "es_mx";
  }
  if (normalized.startsWith("es")) {
    return "es_es";
  }
  if (normalized.startsWith("fr")) {
    return "fr_fr";
  }
  if (normalized.startsWith("de")) {
    return "de_de";
  }
  if (normalized.startsWith("it")) {
    return "it_it";
  }
  if (normalized.startsWith("pl")) {
    return "pl_pl";
  }
  if (normalized.startsWith("ru")) {
    return "ru_ru";
  }
  if (normalized.startsWith("tr")) {
    return "tr_tr";
  }

  return "en_us";
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
  const localized = await fetchJsonByUrl<T>(
    `${cdragonGameDataBase(locale)}/v1/${fileName}`,
  );
  if (localized !== null || locale === "en_us") {
    return localized;
  }

  return fetchJsonByUrl<T>(`${cdragonGameDataBase("en_us")}/v1/${fileName}`);
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
    mapped[id] = { ...entry, id };
  }

  return mapped;
}

async function fetchCdragonGameDataCatalog(
  locale: string,
): Promise<CdragonGameDataCatalog> {
  const [perks, perkStyles, augments] = await Promise.all([
    fetchLocalizedJson<CdragonPerk[] | Record<string, CdragonPerk>>(
      locale,
      "perks.json",
    ),
    fetchLocalizedJson<CdragonPerkStyleCollection>(locale, "perkstyles.json"),
    fetchLocalizedJson<CdragonAugment[] | Record<string, CdragonAugment>>(
      locale,
      "cherry-augments.json",
    ),
  ]);

  return {
    perksById: mapPerksById(perks),
    perkStylesById: mapPerkStylesById(perkStyles),
    augmentsById: mapAugmentsById(augments),
  };
}

export function normalizeCdragonGameAssetPath(
  iconPath: string,
  options: { lowercase?: boolean } = {},
): string {
  const normalized = iconPath.replace(/\\/g, "/");
  const path = options.lowercase ? normalized.toLowerCase() : normalized;
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

export function useCdragonGameDataCatalog(): CdragonGameDataCatalog {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const locale = useMemo(() => normalizeCdragonLocale(language), [language]);
  const swrKey = useMemo(
    () => ["history:cdragon-game-data-catalog", locale] as const,
    [locale],
  );

  const { data = EMPTY_GAME_DATA_CATALOG } = useSWR(
    swrKey,
    ([, cdragonLocale]) => fetchCdragonGameDataCatalog(cdragonLocale),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      fallbackData: EMPTY_GAME_DATA_CATALOG,
    },
  );

  return data;
}
