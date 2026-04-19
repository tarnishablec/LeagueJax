import { useMemo } from "react";
import useSWR from "swr";
import {
  CDRAGON_GAME_DATA_BASE,
  CDRAGON_PERK_STYLE_ICON_BY_ID,
} from "@/features/history/components/match-card/match-card-display";

type CdragonItem = {
  id?: number | string;
  iconPath?: string;
};

type CdragonSummonerSpell = {
  id?: number | string;
  name?: string;
  iconPath?: string;
};

type CdragonPerk = {
  id?: number | string;
  iconPath?: string;
};

interface CdragonStaticCatalog {
  itemIcons: Record<number, string>;
  spellIcons: Record<number, string>;
  spellNames: Record<number, string>;
  perkIcons: Record<number, string>;
}

export type SpellAssetParam = {
  type: "spell";
  spellId: number;
};

export type ItemAssetParam = {
  type: "item";
  itemId: number | null;
};

export type RuneAssetParam = {
  type: "rune";
  runeId: number;
};

export type RuneStyleAssetParam = {
  type: "rune-style";
  styleId: number;
};

export type ProfileIconAssetParam = {
  type: "profile-icon";
  profileIconId: number;
};

export type CdragonAssetParam =
  | SpellAssetParam
  | ItemAssetParam
  | RuneAssetParam
  | RuneStyleAssetParam
  | ProfileIconAssetParam;

export interface CdragonAssetData {
  src: string | null;
  label: string | null;
}

const EMPTY_CDRAGON_CATALOG: CdragonStaticCatalog = {
  itemIcons: {},
  spellIcons: {},
  spellNames: {},
  perkIcons: {},
};

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

function iconFileName(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const fileName = normalized.split("/").at(-1);
  if (!fileName || fileName.trim().length === 0) {
    return null;
  }
  return fileName.replace(/\.(dds|tex|jpg|jpeg|webp)$/i, ".png");
}

function normalizeCdragonIconPath(iconPath: string): string {
  const normalized = iconPath.replace(/\\/g, "/");
  const encoded = encodeURI(
    normalized
      .replace(/\.dds$/i, ".png")
      .replace(/\.tex$/i, ".png")
      .replace(/\.jpg$/i, ".png")
      .replace(/\.jpeg$/i, ".png"),
  );
  if (encoded.startsWith("/lol-game-data/assets")) {
    return `${CDRAGON_GAME_DATA_BASE}${encoded.replace("/lol-game-data/assets", "")}`;
  }
  if (encoded.startsWith("/")) {
    return `${CDRAGON_GAME_DATA_BASE}${encoded}`;
  }
  return `${CDRAGON_GAME_DATA_BASE}/${encoded}`;
}

function normalizeCdragonPerkIconPath(iconPath: string): string {
  return normalizeCdragonIconPath(iconPath.toLowerCase());
}

function cdragonItemIcons(
  collection: CdragonItem[] | Record<string, CdragonItem> | null,
): Record<number, string> {
  const mapped: Record<number, string> = {};

  const consume = (entry: CdragonItem, idFromKey: number | null) => {
    const id = asNumber(entry.id) ?? idFromKey;
    const fileName = entry.iconPath ? iconFileName(entry.iconPath) : null;
    if (id === null || !fileName) {
      return;
    }

    mapped[id] =
      `${CDRAGON_GAME_DATA_BASE}/assets/items/icons2d/${encodeURI(fileName.toLowerCase())}`;
  };

  if (Array.isArray(collection)) {
    for (const entry of collection) {
      consume(entry, null);
    }
  } else if (collection) {
    for (const [key, entry] of Object.entries(collection)) {
      consume(entry, asNumber(key));
    }
  }

  return mapped;
}

function cdragonSpellMaps(
  collection:
    | CdragonSummonerSpell[]
    | Record<string, CdragonSummonerSpell>
    | null,
): Pick<CdragonStaticCatalog, "spellIcons" | "spellNames"> {
  const spellIcons: Record<number, string> = {};
  const spellNames: Record<number, string> = {};

  const consume = (entry: CdragonSummonerSpell, idFromKey: number | null) => {
    const id = asNumber(entry.id) ?? idFromKey;
    const fileName = entry.iconPath ? iconFileName(entry.iconPath) : null;
    if (id === null || !fileName) {
      return;
    }

    spellIcons[id] =
      `${CDRAGON_GAME_DATA_BASE}/data/spells/icons2d/${encodeURI(fileName.toLowerCase())}`;
    if (entry.name && entry.name.trim().length > 0) {
      spellNames[id] = entry.name;
    }
  };

  if (Array.isArray(collection)) {
    for (const entry of collection) {
      consume(entry, null);
    }
  } else if (collection) {
    for (const [key, entry] of Object.entries(collection)) {
      consume(entry, asNumber(key));
    }
  }

  return {
    spellIcons,
    spellNames,
  };
}

function cdragonPerkIcons(
  collection: CdragonPerk[] | Record<string, CdragonPerk> | null,
): Record<number, string> {
  const mapped: Record<number, string> = {};

  const consume = (entry: CdragonPerk, idFromKey: number | null) => {
    const id = asNumber(entry.id) ?? idFromKey;
    if (id === null || !entry.iconPath || entry.iconPath.trim().length === 0) {
      return;
    }

    mapped[id] = normalizeCdragonPerkIconPath(entry.iconPath);
  };

  if (Array.isArray(collection)) {
    for (const entry of collection) {
      consume(entry, null);
    }
  } else if (collection) {
    for (const [key, entry] of Object.entries(collection)) {
      consume(entry, asNumber(key));
    }
  }

  return mapped;
}

async function fetchCdragonStaticCatalog(): Promise<CdragonStaticCatalog> {
  const [items, spells, perks] = await Promise.all([
    fetchJsonByUrl<CdragonItem[] | Record<string, CdragonItem>>(
      `${CDRAGON_GAME_DATA_BASE}/v1/items.json`,
    ),
    fetchJsonByUrl<
      CdragonSummonerSpell[] | Record<string, CdragonSummonerSpell>
    >(`${CDRAGON_GAME_DATA_BASE}/v1/summoner-spells.json`),
    fetchJsonByUrl<CdragonPerk[] | Record<string, CdragonPerk>>(
      `${CDRAGON_GAME_DATA_BASE}/v1/perks.json`,
    ),
  ]);

  const { spellIcons, spellNames } = cdragonSpellMaps(spells);

  return {
    itemIcons: cdragonItemIcons(items),
    spellIcons,
    spellNames,
    perkIcons: cdragonPerkIcons(perks),
  };
}

function resolveCdragonAsset(
  param: CdragonAssetParam,
  cdragonCatalog: CdragonStaticCatalog,
): CdragonAssetData {
  switch (param.type) {
    case "spell": {
      if (param.spellId <= 0) {
        return { src: null, label: null };
      }
      return {
        src: cdragonCatalog.spellIcons[param.spellId] ?? null,
        label: cdragonCatalog.spellNames[param.spellId] ?? null,
      };
    }
    case "item": {
      if (param.itemId === null || param.itemId <= 0) {
        return { src: null, label: null };
      }
      return {
        src: cdragonCatalog.itemIcons[param.itemId] ?? null,
        label: null,
      };
    }
    case "rune": {
      if (param.runeId <= 0) {
        return { src: null, label: null };
      }
      return {
        src: cdragonCatalog.perkIcons[param.runeId] ?? null,
        label: null,
      };
    }
    case "rune-style": {
      if (param.styleId <= 0) {
        return { src: null, label: null };
      }
      return {
        src: CDRAGON_PERK_STYLE_ICON_BY_ID[param.styleId] ?? null,
        label: null,
      };
    }
    case "profile-icon": {
      if (param.profileIconId <= 0) {
        return { src: null, label: null };
      }
      return {
        src: `${CDRAGON_GAME_DATA_BASE}/v1/profile-icons/${param.profileIconId}.jpg`,
        label: null,
      };
    }
    default:
      return { src: null, label: null };
  }
}

function needsStaticCatalog(
  param: CdragonAssetParam | readonly CdragonAssetParam[],
): boolean {
  const assets = Array.isArray(param) ? param : [param];
  return assets.some((assetParam) => assetParam.type !== "profile-icon");
}

export function useCdragonStaticData(
  param: CdragonAssetParam,
): CdragonAssetData;
export function useCdragonStaticData(
  param: readonly CdragonAssetParam[],
): CdragonAssetData[];
export function useCdragonStaticData(
  param: CdragonAssetParam | readonly CdragonAssetParam[],
): CdragonAssetData | CdragonAssetData[] {
  const requireCatalog = useMemo(() => needsStaticCatalog(param), [param]);

  const { data: cdragonCatalog = EMPTY_CDRAGON_CATALOG } = useSWR(
    requireCatalog ? "history:cdragon-static-catalog" : null,
    () => fetchCdragonStaticCatalog(),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      fallbackData: EMPTY_CDRAGON_CATALOG,
    },
  );

  return useMemo(() => {
    if (Array.isArray(param)) {
      return param.map((assetParam) =>
        resolveCdragonAsset(assetParam, cdragonCatalog),
      );
    }
    return resolveCdragonAsset(param as CdragonAssetParam, cdragonCatalog);
  }, [cdragonCatalog, param]);
}
