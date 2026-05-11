import { describe, expect, test } from "bun:test";
import { z } from "zod";
import type {
  RegisteredSetting,
  RegisteredSettingsSection,
  SettingId,
  SettingsSectionKey,
} from "@/features/settings/types";
import {
  buildSettingsPages,
  resolveActivePage,
  resolveSettingsTransitionKey,
} from "./SettingsHub.utils";
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

describe("resolveSettingsTransitionKey", () => {
  test("keeps the settings index route key independent from registered pages", () => {
    expect(resolveSettingsTransitionKey("/main/settings")).toBe(
      "/main/settings",
    );
  });

  test("keeps explicit settings child route keys stable", () => {
    expect(resolveSettingsTransitionKey("/main/settings/about")).toBe(
      "/main/settings/about",
    );
  });
});

const setting = (
  id: SettingId,
  visible: boolean,
  declarationOrder = 0,
): RegisteredSetting => ({
  id,
  labelKey: `${id}.label`,
  scope: "backend",
  control: { kind: "toggle" },
  defaultValue: false,
  order: declarationOrder,
  declarationOrder,
  visible,
  zod: z.boolean(),
  onSet: () => {},
});

const customSection = (
  key: SettingsSectionKey,
  declarationOrder = 0,
): RegisteredSettingsSection => ({
  key,
  order: declarationOrder,
  declarationOrder,
  hasRenderer: true,
});

describe("buildSettingsPages", () => {
  test("does not create page or section from invisible-only settings", () => {
    const pages = buildSettingsPages(
      [setting("tools.claimTool.autoClaimEnabled", false)],
      [],
      [],
    );

    expect(pages).toEqual([]);
  });

  test("creates page and section from visible settings", () => {
    const pages = buildSettingsPages(
      [setting("system.network.timeout", true)],
      [],
      [],
    );

    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe("system");
    expect(pages[0].sections).toHaveLength(1);
    expect(pages[0].sections[0].id).toBe("network");
    expect(pages[0].sections[0].fields).toHaveLength(1);
  });

  test("keeps custom renderer sections even when their fields are invisible", () => {
    const pages = buildSettingsPages(
      [setting("ongoing.playerCardTags.enabled", false)],
      [],
      [customSection("ongoing.playerCardTags")],
    );

    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe("ongoing");
    expect(pages[0].sections).toHaveLength(1);
    expect(pages[0].sections[0].id).toBe("playerCardTags");
    expect(pages[0].sections[0].fields).toEqual([]);
  });
});
