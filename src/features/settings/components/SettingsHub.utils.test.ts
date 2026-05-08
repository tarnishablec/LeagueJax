import { describe, expect, test } from "bun:test";
import { resolveActivePage } from "./SettingsHub.utils";
import type { PageEntry } from "./settings-view-model";

function page(id: string): PageEntry {
  return {
    id,
    order: 0,
    declarationOrder: 0,
    sections: [],
  };
}

describe("resolveActivePage", () => {
  test("uses the first registered page when no page id is provided", () => {
    const systemPage = page("system");
    const historyPage = page("history");

    expect(resolveActivePage([systemPage, historyPage])).toBe(systemPage);
  });

  test("returns null when the requested page id is not registered", () => {
    expect(resolveActivePage([page("system")], "missing")).toBeNull();
  });
});
