import { useMemo } from "react";
import useSWR from "swr";
import { getJaxRuntime } from "@/features/registry";
import { StaticCacheShard } from "@/features/static-cache/manifest";

type CdragonChampionSummaryEntry = {
  id?: number | string;
  name?: string;
  alias?: string;
  squarePortraitPath?: string;
};

export type CdragonChampionAsset = {
  id: number;
  alias: string;
  name: string | null;
  src: string;
};

export type CdragonChampionCatalog = {
  byAlias: Record<string, CdragonChampionAsset>;
};

const CDRAGON_GAME_DATA_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";
const CDRAGON_CHAMPION_SUMMARY_NAMESPACE = "cdragon_latest_game_data";
const CDRAGON_CHAMPION_SUMMARY_FILE = "champion-summary.json";
const CDRAGON_CHAMPION_SUMMARY_URL = `${CDRAGON_GAME_DATA_BASE}/v1/${CDRAGON_CHAMPION_SUMMARY_FILE}`;

const EMPTY_CHAMPION_CATALOG: CdragonChampionCatalog = {
  byAlias: {},
};

export function championAliasKey(alias: string): string {
  return alias.trim().toLowerCase();
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

function cdragonGameDataAssetUrl(path: string, championId: number): string {
  const normalized = path.trim().replace(/\\/g, "/");
  if (!normalized) {
    return `${CDRAGON_GAME_DATA_BASE}/v1/champion-icons/${championId}.png`;
  }

  const encoded = encodeURI(normalized);
  if (encoded.startsWith("/lol-game-data/assets")) {
    return `${CDRAGON_GAME_DATA_BASE}${encoded.replace("/lol-game-data/assets", "")}`;
  }
  if (encoded.startsWith("/")) {
    return `${CDRAGON_GAME_DATA_BASE}${encoded}`;
  }
  return `${CDRAGON_GAME_DATA_BASE}/${encoded}`;
}

function mapChampionSummary(
  entries: CdragonChampionSummaryEntry[],
): CdragonChampionCatalog {
  const byAlias: Record<string, CdragonChampionAsset> = {};

  for (const entry of entries) {
    const id = asNumber(entry.id);
    const alias = entry.alias?.trim();
    if (id === null || id <= 0 || !alias) {
      continue;
    }

    byAlias[championAliasKey(alias)] = {
      id,
      alias,
      name: entry.name?.trim() || null,
      src: cdragonGameDataAssetUrl(entry.squarePortraitPath ?? "", id),
    };
  }

  return { byAlias };
}

async function fetchCdragonChampionCatalog(): Promise<CdragonChampionCatalog> {
  const entries = await getJaxRuntime()
    .getShard(StaticCacheShard)
    .getJson<CdragonChampionSummaryEntry[]>({
      namespace: CDRAGON_CHAMPION_SUMMARY_NAMESPACE,
      fileName: CDRAGON_CHAMPION_SUMMARY_FILE,
      urls: [CDRAGON_CHAMPION_SUMMARY_URL],
    });

  return mapChampionSummary(entries);
}

export function useCdragonChampionCatalog(): CdragonChampionCatalog {
  const { data = EMPTY_CHAMPION_CATALOG } = useSWR(
    "cdragon:champion-summary",
    fetchCdragonChampionCatalog,
    {
      dedupingInterval: Number.POSITIVE_INFINITY,
      fallbackData: EMPTY_CHAMPION_CATALOG,
      keepPreviousData: true,
    },
  );

  return useMemo(() => data, [data]);
}
