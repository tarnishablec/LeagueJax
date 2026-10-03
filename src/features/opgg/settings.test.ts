import { describe, expect, test } from "bun:test";
import type { SettingsSnapshotDto } from "@/bindings/settings";
import {
  championFiltersFromSettings,
  OPGG_RANK_TIER_SETTING,
  OPGG_REGION_SETTING,
  parseCounterColumnLimit,
} from "./settings";

describe("OP.GG saved filters", () => {
  test("restores both controls from a persisted settings snapshot", () => {
    const snapshot: SettingsSnapshotDto = {
      values: {
        [OPGG_REGION_SETTING]: "kr",
        [OPGG_RANK_TIER_SETTING]: "challenger",
      },
    };
    expect(
      championFiltersFromSettings(
        snapshot.values[OPGG_REGION_SETTING],
        snapshot.values[OPGG_RANK_TIER_SETTING],
      ),
    ).toEqual({ region: "kr", tier: "challenger" });
  });

  test("falls back independently for absent or invalid saved filters", () => {
    expect(championFiltersFromSettings(undefined, undefined)).toEqual({
      region: "global",
      tier: "emerald_plus",
    });
    expect(championFiltersFromSettings("invalid", "master_plus")).toEqual({
      region: "global",
      tier: "master_plus",
    });
    expect(championFiltersFromSettings("jp", null)).toEqual({
      region: "jp",
      tier: "emerald_plus",
    });
    expect(championFiltersFromSettings(1, "MASTER_PLUS")).toEqual({
      region: "global",
      tier: "emerald_plus",
    });
  });
});

describe("OP.GG matchup limit", () => {
  test.each([1, 8, 50])("accepts %s as a per-column limit", (limit) => {
    expect(parseCounterColumnLimit(limit)).toBe(limit);
  });

  test.each([0, 51, -1, 1.5, Number.NaN, Infinity, "8", null, undefined])(
    "rejects invalid limit %s",
    (value) => {
      expect(parseCounterColumnLimit(value)).toBeUndefined();
    },
  );
});
