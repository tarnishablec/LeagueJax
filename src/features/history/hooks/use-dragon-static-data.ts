import { useMemo, useSyncExternalStore } from "react";
import useSWR from "swr";
import { settingsApi } from "@/features/settings/store";
import type { AssetSource } from "@/features/settings/store/general";
import { SYSTEM_ASSET_SOURCE_SETTING_ID } from "@/features/settings/store/general";
import { useGameVersion } from "@/hooks/use-game-version";
import {
  CDRAGON_GAME_DATA_BASE,
  CDRAGON_PERK_STYLE_ICON_BY_ID,
  DDRAGON_PERK_STYLE_ICON_BY_ID,
} from "../components/match-card-display";

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

type CdragonItem = {
  id?: number | string;
  iconPath?: string;
};

type CdragonSummonerSpell = {
  id?: number | string;
  name?: string;
  iconPath?: string;
};

type DdragonSummonerSpell = {
  key?: string;
  name?: string;
  image?: {
    full?: string;
  };
};

type DdragonSummonerSpellResponse = {
  data?: Record<string, DdragonSummonerSpell>;
};

type DdragonRune = {
  id?: number;
  icon?: string;
};

type DdragonRuneSlot = {
  runes?: DdragonRune[];
};

type DdragonRuneStyle = {
  id?: number;
  icon?: string;
  slots?: DdragonRuneSlot[];
};

interface CdragonStaticCatalog {
  itemIcons: Record<number, string>;
  spellIcons: Record<number, string>;
  spellNames: Record<number, string>;
}

interface DdragonStaticCatalog {
  spellIcons: Record<number, string>;
  spellNames: Record<number, string>;
  perkIcons: Record<number, string>;
  cdragonPerkIcons: Record<number, string>;
  perkStyleIcons: Record<number, string>;
}

export type SpellAssetParam = {
  type: "spell";
  spellId: number;
};

export type ItemAssetParam = {
  type: "item";
  itemId: number;
};

export type RuneAssetParam = {
  type: "rune";
  runeId: number;
};

export type RuneStyleAssetParam = {
  type: "rune-style";
  styleId: number;
};

export type DragonAssetParam =
  | SpellAssetParam
  | ItemAssetParam
  | RuneAssetParam
  | RuneStyleAssetParam;

export interface DragonAssetData {
  src: string | null;
  label: string | null;
}

const EMPTY_CDRAGON_CATALOG: CdragonStaticCatalog = {
  itemIcons: {},
  spellIcons: {},
  spellNames: {},
};

const EMPTY_DDRAGON_CATALOG: DdragonStaticCatalog = {
  spellIcons: {},
  spellNames: {},
  perkIcons: {},
  cdragonPerkIcons: {},
  perkStyleIcons: DDRAGON_PERK_STYLE_ICON_BY_ID,
};

function useSelectedAssetSource(): AssetSource {
  return useSyncExternalStore(
    (onStoreChange) =>
      settingsApi.subscribe(SYSTEM_ASSET_SOURCE_SETTING_ID, onStoreChange),
    () =>
      settingsApi.get<AssetSource>(SYSTEM_ASSET_SOURCE_SETTING_ID) ?? "cdragon",
    () =>
      settingsApi.get<AssetSource>(SYSTEM_ASSET_SOURCE_SETTING_ID) ?? "cdragon",
  );
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

function toDdragonVersion(version: string | undefined): string | null {
  if (!version || version.trim().length === 0) {
    return null;
  }

  const segments = version
    .trim()
    .split(".")
    .filter((segment) => segment.length > 0);

  if (segments.length < 2) {
    return null;
  }

  const major = segments[0];
  const minor = segments[1];
  const patch = segments[2] ?? "1";
  return `${major}.${minor}.${patch}`;
}

function ddragonDataUrl(version: string, fileName: string): string {
  return `${DDRAGON_BASE}/cdn/${version}/data/en_US/${fileName}`;
}

function iconFileName(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const fileName = normalized.split("/").at(-1);
  if (!fileName || fileName.trim().length === 0) {
    return null;
  }
  return fileName.replace(/\.(dds|tex|jpg|jpeg|webp)$/i, ".png");
}

function normalizeDdragonIconPath(iconPath: string): string {
  if (iconPath.startsWith("https://") || iconPath.startsWith("http://")) {
    return iconPath;
  }

  const normalized = iconPath.replace(/^\/+/, "");
  return `${DDRAGON_BASE}/cdn/img/${encodeURI(normalized)}`;
}

function toCdragonPerkImagePath(iconPath: string): string | null {
  const normalized = iconPath.replace(/\\/g, "/");
  const marker = "perk-images/";
  const markerIndex = normalized.toLowerCase().indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const suffix = normalized.slice(markerIndex);
  if (suffix.trim().length === 0) {
    return null;
  }

  return `${CDRAGON_GAME_DATA_BASE}/v1/${encodeURI(suffix.toLowerCase())}`;
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

async function fetchCdragonStaticCatalog(): Promise<CdragonStaticCatalog> {
  const [items, spells] = await Promise.all([
    fetchJsonByUrl<CdragonItem[] | Record<string, CdragonItem>>(
      `${CDRAGON_GAME_DATA_BASE}/v1/items.json`,
    ),
    fetchJsonByUrl<
      CdragonSummonerSpell[] | Record<string, CdragonSummonerSpell>
    >(`${CDRAGON_GAME_DATA_BASE}/v1/summoner-spells.json`),
  ]);

  const { spellIcons, spellNames } = cdragonSpellMaps(spells);

  return {
    itemIcons: cdragonItemIcons(items),
    spellIcons,
    spellNames,
  };
}

function ddragonSpellMaps(
  payload: DdragonSummonerSpellResponse | null,
  version: string,
): Pick<DdragonStaticCatalog, "spellIcons" | "spellNames"> {
  const spellIcons: Record<number, string> = {};
  const spellNames: Record<number, string> = {};

  for (const spell of Object.values(payload?.data ?? {})) {
    const id = asNumber(spell.key);
    const fileName = spell.image?.full;
    if (id === null || !fileName) {
      continue;
    }

    spellIcons[id] =
      `${DDRAGON_BASE}/cdn/${version}/img/spell/${encodeURIComponent(fileName)}`;
    if (spell.name && spell.name.trim().length > 0) {
      spellNames[id] = spell.name;
    }
  }

  return {
    spellIcons,
    spellNames,
  };
}

function ddragonRuneMaps(
  styles: DdragonRuneStyle[] | null,
): Pick<
  DdragonStaticCatalog,
  "perkIcons" | "cdragonPerkIcons" | "perkStyleIcons"
> {
  const perkIcons: Record<number, string> = {};
  const cdragonPerkIcons: Record<number, string> = {};
  const perkStyleIcons: Record<number, string> = {
    ...DDRAGON_PERK_STYLE_ICON_BY_ID,
  };

  for (const style of styles ?? []) {
    const styleId = asNumber(style.id);
    if (styleId !== null && style.icon) {
      perkStyleIcons[styleId] = normalizeDdragonIconPath(style.icon);
    }

    for (const slot of style.slots ?? []) {
      for (const rune of slot.runes ?? []) {
        const runeId = asNumber(rune.id);
        if (runeId === null || !rune.icon) {
          continue;
        }

        perkIcons[runeId] = normalizeDdragonIconPath(rune.icon);

        const cdragonPath = toCdragonPerkImagePath(rune.icon);
        if (cdragonPath) {
          cdragonPerkIcons[runeId] = cdragonPath;
        }
      }
    }
  }

  return {
    perkIcons,
    cdragonPerkIcons,
    perkStyleIcons,
  };
}

async function fetchDdragonStaticCatalog(
  ddragonVersion: string,
): Promise<DdragonStaticCatalog> {
  const [spells, runes] = await Promise.all([
    fetchJsonByUrl<DdragonSummonerSpellResponse>(
      ddragonDataUrl(ddragonVersion, "summoner.json"),
    ),
    fetchJsonByUrl<DdragonRuneStyle[]>(
      ddragonDataUrl(ddragonVersion, "runesReforged.json"),
    ),
  ]);

  const { spellIcons, spellNames } = ddragonSpellMaps(spells, ddragonVersion);
  const { perkIcons, cdragonPerkIcons, perkStyleIcons } =
    ddragonRuneMaps(runes);

  return {
    spellIcons,
    spellNames,
    perkIcons,
    cdragonPerkIcons,
    perkStyleIcons,
  };
}

interface ResolveContext {
  ddragonVersion: string | null;
  cdragonCatalog: CdragonStaticCatalog;
  ddragonCatalog: DdragonStaticCatalog;
}

function resolveFromCdragon(
  param: DragonAssetParam,
  cdragonCatalog: CdragonStaticCatalog,
  ddragonCatalog: DdragonStaticCatalog,
): DragonAssetData {
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
      if (param.itemId <= 0) {
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
        src: ddragonCatalog.cdragonPerkIcons[param.runeId] ?? null,
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
    default:
      return { src: null, label: null };
  }
}

function resolveFromDdragon(
  param: DragonAssetParam,
  ddragonCatalog: DdragonStaticCatalog,
  ddragonVersion: string | null,
): DragonAssetData {
  switch (param.type) {
    case "spell": {
      if (param.spellId <= 0) {
        return { src: null, label: null };
      }
      return {
        src: ddragonCatalog.spellIcons[param.spellId] ?? null,
        label: ddragonCatalog.spellNames[param.spellId] ?? null,
      };
    }
    case "item": {
      if (param.itemId <= 0 || !ddragonVersion) {
        return { src: null, label: null };
      }
      return {
        src: `${DDRAGON_BASE}/cdn/${ddragonVersion}/img/item/${param.itemId}.png`,
        label: null,
      };
    }
    case "rune": {
      if (param.runeId <= 0) {
        return { src: null, label: null };
      }
      return {
        src: ddragonCatalog.perkIcons[param.runeId] ?? null,
        label: null,
      };
    }
    case "rune-style": {
      if (param.styleId <= 0) {
        return { src: null, label: null };
      }
      return {
        src: ddragonCatalog.perkStyleIcons[param.styleId] ?? null,
        label: null,
      };
    }
    default:
      return { src: null, label: null };
  }
}

function resolveDragonAsset(
  param: DragonAssetParam,
  context: ResolveContext,
  assetSource: AssetSource,
): DragonAssetData {
  if (assetSource === "cdragon") {
    return resolveFromCdragon(
      param,
      context.cdragonCatalog,
      context.ddragonCatalog,
    );
  }

  return resolveFromDdragon(
    param,
    context.ddragonCatalog,
    context.ddragonVersion,
  );
}

export function useDragonStaticData(param: DragonAssetParam): DragonAssetData;
export function useDragonStaticData(
  param: readonly DragonAssetParam[],
): DragonAssetData[];
export function useDragonStaticData(
  param: DragonAssetParam | readonly DragonAssetParam[],
): DragonAssetData | DragonAssetData[] {
  const assetSource = useSelectedAssetSource();
  const { data: gameVersion } = useGameVersion();
  const ddragonVersion = useMemo(
    () => toDdragonVersion(gameVersion),
    [gameVersion],
  );

  const { data: cdragonCatalog = EMPTY_CDRAGON_CATALOG } = useSWR(
    "history:cdragon-static-catalog",
    fetchCdragonStaticCatalog,
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      revalidateOnFocus: false,
      fallbackData: EMPTY_CDRAGON_CATALOG,
    },
  );

  const { data: ddragonCatalog = EMPTY_DDRAGON_CATALOG } = useSWR(
    ddragonVersion ? ["history:ddragon-static-catalog", ddragonVersion] : null,
    ([, version]) => fetchDdragonStaticCatalog(version),
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      revalidateOnFocus: false,
      fallbackData: EMPTY_DDRAGON_CATALOG,
    },
  );

  const context = useMemo<ResolveContext>(
    () => ({
      ddragonVersion,
      cdragonCatalog,
      ddragonCatalog,
    }),
    [ddragonVersion, cdragonCatalog, ddragonCatalog],
  );

  return useMemo(() => {
    if (Array.isArray(param)) {
      return param.map((assetParam) =>
        resolveDragonAsset(assetParam, context, assetSource),
      );
    }
    return resolveDragonAsset(param as DragonAssetParam, context, assetSource);
  }, [context, assetSource, param]);
}
