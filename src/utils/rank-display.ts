import type { RankEntry, RankStats, Tier } from "@/bindings/rank";

type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

type TierKey =
  | "iron"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "emerald"
  | "diamond"
  | "master"
  | "grandmaster"
  | "challenger"
  | "unranked";

const TIER_KEY_BY_VALUE: Record<Tier, TierKey> = {
  IRON: "iron",
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
  EMERALD: "emerald",
  DIAMOND: "diamond",
  MASTER: "master",
  GRANDMASTER: "grandmaster",
  CHALLENGER: "challenger",
  NONE: "unranked",
  "": "unranked",
};

const TIER_DEFAULT_LABEL: Record<TierKey, string> = {
  iron: "Iron",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  emerald: "Emerald",
  diamond: "Diamond",
  master: "Master",
  grandmaster: "Grandmaster",
  challenger: "Challenger",
  unranked: "Unranked",
};

const APEX_TIERS = new Set<Tier>(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function normalizeTierKey(tier: string | null | undefined): TierKey {
  if (!tier) {
    return "unranked";
  }

  const normalized = tier.trim().toUpperCase() as Tier;
  return TIER_KEY_BY_VALUE[normalized] ?? "unranked";
}

function resolveTierKey(tier: string | null | undefined): TierKey | null {
  if (!tier) {
    return "unranked";
  }

  const normalized = tier.trim().toUpperCase() as Tier;
  if (!normalized) {
    return "unranked";
  }

  return TIER_KEY_BY_VALUE[normalized] ?? null;
}

export function getBestRankEntry(
  stats: RankStats | null | undefined,
): RankEntry | null {
  return stats?.highestRankedEntrySr ?? stats?.highestRankedEntry ?? null;
}

export function resolveRankTierForIcon(
  entry: RankEntry | null | undefined,
): string {
  if (!entry) {
    return "UNRANKED";
  }

  const key = normalizeTierKey(entry.tier);
  if (key === "unranked") {
    return "UNRANKED";
  }

  return entry.tier;
}

export function formatRankTierLabel(
  t: TranslateFn,
  tier: string | null | undefined,
): string {
  const key = resolveTierKey(tier);
  if (!key) {
    return tier?.trim() || TIER_DEFAULT_LABEL.unranked;
  }
  return t(`rank.tier.${key}`, {
    defaultValue: TIER_DEFAULT_LABEL[key],
  });
}

export function isApexRankTier(tier: string | null | undefined): boolean {
  const normalized = tier?.trim().toUpperCase() as Tier | undefined;
  return normalized ? APEX_TIERS.has(normalized) : false;
}

export function formatRankDivisionLabel(
  entry: RankEntry | null | undefined,
): string {
  if (!entry || isApexRankTier(entry.tier)) {
    return "";
  }

  const division = entry.division.trim();
  return division.length > 0 && division !== "NA" ? division : "";
}

export function formatRankEntryTierLabel(
  t: TranslateFn,
  entry: RankEntry | null | undefined,
): string {
  if (!entry) {
    return formatRankTierLabel(t, "NONE");
  }

  const tierLabel = formatRankTierLabel(t, entry.tier);
  if (tierLabel.length === 0) {
    return formatRankTierLabel(t, "NONE");
  }

  const division = formatRankDivisionLabel(entry);
  return division.length > 0 ? `${tierLabel} ${division}` : tierLabel;
}

export function formatRankEntryLabel(
  t: TranslateFn,
  entry: RankEntry | null | undefined,
): string {
  if (!entry) {
    return formatRankTierLabel(t, "NONE");
  }

  const tierLabel = formatRankEntryTierLabel(t, entry);
  return `${tierLabel} ${entry.leaguePoints} LP`;
}
