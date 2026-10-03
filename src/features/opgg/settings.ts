import type { OpggFiltersDto } from "@/bindings/opgg";
import {
  DEFAULT_CHAMPION_FILTERS,
  isOpggRankTier,
  isOpggRegion,
} from "./filters";

export const OPGG_RANK_TIER_SETTING = "opgg.filters.rankTier";
export const OPGG_REGION_SETTING = "opgg.filters.region";

export const OPGG_COUNTER_COLUMN_LIMIT_SETTING =
  "opgg.matchups.counterColumnLimit";
export const DEFAULT_COUNTER_COLUMN_LIMIT = 8;

// Validate stored values at the feature boundary before constructing API request keys.
export function championFiltersFromSettings(
  region: unknown,
  tier: unknown,
): OpggFiltersDto {
  return {
    region:
      typeof region === "string" && isOpggRegion(region)
        ? region
        : DEFAULT_CHAMPION_FILTERS.region,
    tier:
      typeof tier === "string" && isOpggRankTier(tier)
        ? tier
        : DEFAULT_CHAMPION_FILTERS.tier,
  };
}

export function parseCounterColumnLimit(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 50
    ? value
    : undefined;
}
