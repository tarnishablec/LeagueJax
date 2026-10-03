import { describe, expect, expectTypeOf, test } from "bun:test";
import type {
  OpggChampionDetailDto,
  OpggChampionListDto,
  OpggChampionSummaryDto,
  OpggFiltersDto,
  OpggRankTier,
  OpggRegion,
} from "@/bindings/opgg";
import {
  DEFAULT_CHAMPION_FILTERS,
  isOpggRankTier,
  isOpggRegion,
  OPGG_RANK_TIERS,
  OPGG_REGIONS,
} from "./filters";
import { championsI18n } from "./i18n";
import {
  championDetailArgs,
  championDetailKey,
  championListArgs,
  championListKey,
  currentChampionDetail,
  currentChampionList,
  resolveSelectedChampionId,
} from "./queries";

const globalEmerald: OpggFiltersDto = {
  region: "global",
  tier: "emerald_plus",
};
const koreaEmerald: OpggFiltersDto = { region: "kr", tier: "emerald_plus" };
const globalDiamond: OpggFiltersDto = {
  region: "global",
  tier: "diamond_plus",
};

function champion(id: number): OpggChampionSummaryDto {
  return {
    id,
    winRate: 0.52,
    pickRate: 0.1,
    banRate: 0.05,
    tier: 1,
    positions: [],
  };
}

function list(filters: OpggFiltersDto): OpggChampionListDto {
  return { filters, version: "16.19", champions: [champion(222)] };
}

function detail(filters: OpggFiltersDto): OpggChampionDetailDto {
  return {
    filters,
    counterColumnLimit: 8,
    version: "16.19",
    id: 222,
    position: "ADC",
    tier: 1,
    winRate: 0.52,
    pickRate: 0.1,
    banRate: 0.05,
    summonerSpells: [],
    starterItems: [],
    boots: [],
    coreItems: [],
    lastItems: [],
    skillPriority: [],
    skillOrder: [],
    skillPickRate: 0,
    skillWinRate: 0,
    strongAgainst: [],
    weakAgainst: [],
  };
}

describe("OP.GG filter options", () => {
  test("covers the complete Rust filter enums and validates select values", () => {
    expectTypeOf<(typeof OPGG_REGIONS)[number]>().toEqualTypeOf<OpggRegion>();
    expectTypeOf<
      (typeof OPGG_RANK_TIERS)[number]
    >().toEqualTypeOf<OpggRankTier>();
    expect(DEFAULT_CHAMPION_FILTERS).toEqual(globalEmerald);
    expect(OPGG_REGIONS.every(isOpggRegion)).toBe(true);
    expect(OPGG_RANK_TIERS.every(isOpggRankTier)).toBe(true);
    for (const value of [undefined, "", "unknown", "../kr"]) {
      expect(isOpggRegion(value)).toBe(false);
      expect(isOpggRankTier(value)).toBe(false);
    }
    expect(isOpggRegion("cn")).toBe(false);
    expect(isOpggRankTier("EMERALD_PLUS")).toBe(false);
  });

  test.each(["en", "zh-CN", "ja-JP"] as const)(
    "translates every selectable value in %s",
    (locale) => {
      const dictionary = championsI18n[locale]?.champions as Record<
        string,
        unknown
      >;
      const regions = dictionary.regions as Record<string, string>;
      const tiers = dictionary.rankTiers as Record<string, string>;
      for (const region of OPGG_REGIONS) expect(regions[region]).toBeTruthy();
      for (const tier of OPGG_RANK_TIERS) expect(tiers[tier]).toBeTruthy();
      expect(dictionary.source).toContain("{{region}}");
      expect(dictionary.source).toContain("{{rank}}");
      const settings = championsI18n[locale]?.settings as {
        pages: { opgg: { title: string } };
        sections: { opgg: { matchups: { title: string } } };
        opgg: { counterColumnLimit: { label: string; hint: string } };
      };
      expect(settings.pages.opgg.title).toBe("OP.GG");
      expect(settings.sections.opgg.matchups.title).toBeTruthy();
      expect(settings.opgg.counterColumnLimit.label).toBeTruthy();
      expect(settings.opgg.counterColumnLimit.hint).toBeTruthy();
    },
  );
});

describe("champion request scopes", () => {
  test("isolates every region and rank combination in both caches", () => {
    const listKeys = new Set<string>();
    const detailKeys = new Set<string>();
    for (const region of OPGG_REGIONS) {
      for (const tier of OPGG_RANK_TIERS) {
        const filters = { region, tier };
        listKeys.add(JSON.stringify(championListKey(filters)));
        detailKeys.add(
          JSON.stringify(championDetailKey(filters, 222, "ADC", 8)),
        );
      }
    }
    expect(listKeys.size).toBe(OPGG_REGIONS.length * OPGG_RANK_TIERS.length);
    expect(detailKeys.size).toBe(listKeys.size);
    for (const key of detailKeys) expect(listKeys.has(key)).toBe(false);
  });

  test("includes champion and position in the detail cache identity", () => {
    const keys = [
      championDetailKey(globalEmerald, 222, "ADC", 8),
      championDetailKey(globalEmerald, 222, "MID", 8),
      championDetailKey(globalEmerald, 103, "MID", 8),
    ];
    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(3);
  });

  test("disables details until both a champion and position are available", () => {
    expect(championDetailKey(globalEmerald, null, "ADC", 8)).toBeNull();
    expect(championDetailKey(globalEmerald, 222, null, 8)).toBeNull();
    expect(championDetailKey(globalEmerald, 222, "", 8)).toBeNull();
  });

  test("snapshots request arguments so a later filter change cannot alter an in-flight request", () => {
    const filters = { ...koreaEmerald };
    const listKey = championListKey(filters);
    const detailKey = championDetailKey(filters, 222, "ADC", 8);
    if (!detailKey) throw new Error("Expected an active champion detail key");
    filters.region = "na";
    filters.tier = "all";
    expect(championListArgs(listKey)).toEqual({ filters: koreaEmerald });
    expect(championDetailArgs(detailKey)).toEqual({
      championId: 222,
      position: "ADC",
      filters: koreaEmerald,
      counterColumnLimit: 8,
    });
  });

  test("rejects retained lists from either a different region or a different tier", () => {
    const previous = list(globalEmerald);
    expect(currentChampionList(previous, globalEmerald)).toBe(previous);
    expect(currentChampionList(previous, koreaEmerald)).toBeUndefined();
    expect(currentChampionList(previous, globalDiamond)).toBeUndefined();
    expect(currentChampionList(undefined, globalEmerald)).toBeUndefined();
  });

  test("rejects stale details even when champion and position did not change", () => {
    const previous = detail(globalEmerald);
    expect(currentChampionDetail(previous, globalEmerald, 222, "ADC", 8)).toBe(
      previous,
    );
    expect(
      currentChampionDetail(previous, koreaEmerald, 222, "ADC", 8),
    ).toBeUndefined();
    expect(
      currentChampionDetail(previous, globalDiamond, 222, "ADC", 8),
    ).toBeUndefined();
    expect(
      currentChampionDetail(previous, globalEmerald, 222, "MID", 8),
    ).toBeUndefined();
    expect(
      currentChampionDetail(previous, globalEmerald, 103, "ADC", 8),
    ).toBeUndefined();
    expect(
      currentChampionDetail(previous, globalEmerald, null, null, 8),
    ).toBeUndefined();
  });

  test("a late response from the old scope cannot displace the active result", async () => {
    let finishPrevious: (value: OpggChampionListDto) => void = () => {};
    const previousRequest = new Promise<OpggChampionListDto>((resolve) => {
      finishPrevious = resolve;
    });
    const active = list(koreaEmerald);
    expect(currentChampionList(active, koreaEmerald)).toBe(active);
    finishPrevious(list(globalEmerald));
    expect(
      currentChampionList(await previousRequest, koreaEmerald),
    ).toBeUndefined();
    expect(currentChampionList(active, koreaEmerald)).toBe(active);
  });

  test("rapid lane changes retain distinct request arguments and reject a late lane response", async () => {
    const firstKey = championDetailKey(globalEmerald, 222, "JUNGLE", 8);
    const nextKey = championDetailKey(globalEmerald, 222, "MID", 8);
    if (!firstKey || !nextKey)
      throw new Error("Expected two active lane requests");
    let finishFirst: (value: OpggChampionDetailDto) => void = () => {};
    const firstRequest = new Promise<OpggChampionDetailDto>((resolve) => {
      finishFirst = resolve;
    });
    const next = { ...detail(globalEmerald), position: "MID" };
    expect(championDetailArgs(firstKey).position).toBe("JUNGLE");
    expect(championDetailArgs(nextKey).position).toBe("MID");
    expect(currentChampionDetail(next, globalEmerald, 222, "MID", 8)).toBe(
      next,
    );
    finishFirst({ ...detail(globalEmerald), position: "JUNGLE" });
    expect(
      currentChampionDetail(await firstRequest, globalEmerald, 222, "MID", 8),
    ).toBeUndefined();
  });

  test("isolates matchup limits in cache keys and immutable request arguments", () => {
    const keys = [1, 8, 50].map((limit) =>
      championDetailKey(globalEmerald, 222, "ADC", limit),
    );
    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(3);
    for (const [index, key] of keys.entries()) {
      if (!key) throw new Error("Expected an active matchup request");
      expect(championDetailArgs(key).counterColumnLimit).toBe(
        [1, 8, 50][index],
      );
    }
  });

  test("rejects late or cached details after the configured limit changes", async () => {
    let finishPrevious: (value: OpggChampionDetailDto) => void = () => {};
    const previousRequest = new Promise<OpggChampionDetailDto>((resolve) => {
      finishPrevious = resolve;
    });
    const previous = detail(globalEmerald);
    const active = { ...previous, counterColumnLimit: 3 };
    expect(currentChampionDetail(active, globalEmerald, 222, "ADC", 3)).toBe(
      active,
    );
    expect(
      currentChampionDetail(previous, globalEmerald, 222, "ADC", 3),
    ).toBeUndefined();
    finishPrevious(previous);
    expect(
      currentChampionDetail(
        await previousRequest,
        globalEmerald,
        222,
        "ADC",
        3,
      ),
    ).toBeUndefined();
    expect(currentChampionDetail(previous, globalEmerald, 222, "ADC", 8)).toBe(
      previous,
    );
  });
});

describe("champion selection after filtering", () => {
  test("keeps selection while data is unavailable and when the hero remains in the result", () => {
    expect(resolveSelectedChampionId(222, undefined)).toBe(222);
    expect(resolveSelectedChampionId(222, [champion(103), champion(222)])).toBe(
      222,
    );
  });

  test("chooses a valid result only after the new list is available", () => {
    expect(resolveSelectedChampionId(222, [champion(103)])).toBe(103);
    expect(resolveSelectedChampionId(null, [champion(103)])).toBe(103);
    expect(resolveSelectedChampionId(222, [])).toBeNull();
  });
});
