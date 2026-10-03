import { describe, expect, test } from "bun:test";
import { parseCounterColumnLimit } from "./settings";

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
