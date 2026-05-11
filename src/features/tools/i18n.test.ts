import { describe, expect, test } from "bun:test";
import { toolsI18n } from "./i18n";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value == null || typeof value !== "object") {
    return [prefix];
  }

  return Object.entries(value)
    .flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    )
    .sort();
}

describe("toolsI18n", () => {
  test("keeps claim tool locale keys in sync", () => {
    const englishKeys = flattenKeys(toolsI18n.en);

    expect(flattenKeys(toolsI18n["zh-CN"])).toEqual(englishKeys);
    expect(flattenKeys(toolsI18n["ja-JP"])).toEqual(englishKeys);
  });
});
