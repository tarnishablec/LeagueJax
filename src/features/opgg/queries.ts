import type {
  OpggChampionDetailDto,
  OpggChampionListDto,
  OpggChampionSummaryDto,
  OpggFiltersDto,
} from "@/bindings/opgg";
import { matchesChampionFilters } from "./filters";

// Snapshot scalar filters in the key so cache entries and in-flight requests
// cannot change scope when the user makes another selection.
export function championListKey(filters: OpggFiltersDto) {
  return ["opgg:champions:ranked", filters.region, filters.tier] as const;
}

export function championDetailKey(
  filters: OpggFiltersDto,
  championId: number | null,
  position: string | null,
  counterColumnLimit: number,
) {
  return championId === null || !position
    ? null
    : ([
        "opgg:champion",
        filters.region,
        filters.tier,
        championId,
        position,
        counterColumnLimit,
      ] as const);
}

export function championListArgs(key: ReturnType<typeof championListKey>) {
  const [, region, tier] = key;
  return { filters: { region, tier } };
}

export function championDetailArgs(
  key: NonNullable<ReturnType<typeof championDetailKey>>,
) {
  const [, region, tier, championId, position, counterColumnLimit] = key;
  return {
    championId,
    position,
    filters: { region, tier },
    counterColumnLimit,
  };
}

// Solid resources can retain previous data while loading another key. Check
// the echoed scope instead of relabeling stale data with the active filters.
export function currentChampionList(
  data: OpggChampionListDto | undefined,
  filters: OpggFiltersDto,
) {
  return matchesChampionFilters(data?.filters, filters) ? data : undefined;
}

export function currentChampionDetail(
  data: OpggChampionDetailDto | undefined,
  filters: OpggFiltersDto,
  championId: number | null,
  position: string | null,
  counterColumnLimit: number,
) {
  return matchesChampionFilters(data?.filters, filters) &&
    data?.id === championId &&
    data.position === position &&
    data.counterColumnLimit === counterColumnLimit
    ? data
    : undefined;
}

// An unavailable list represents an in-flight or failed request, not an empty
// result. Keep the user's selection until the new scoped list can validate it.
export function resolveSelectedChampionId(
  current: number | null,
  rows: readonly OpggChampionSummaryDto[] | undefined,
): number | null {
  if (!rows || rows.some((champion) => champion.id === current)) return current;
  return rows[0]?.id ?? null;
}
