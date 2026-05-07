import { describe, expect, test } from "bun:test";
import { resolveFocusSyncActions } from "./use-focus-sync";

describe("resolveFocusSyncActions", () => {
  test("preserves an explicitly opened tab on first history route mount", () => {
    expect(
      resolveFocusSyncActions({
        autoOpenOwnTab: true,
        connectedHasSummoner: true,
        focusedPid: 1001,
        hasExistingTabs: true,
        lastSyncedPid: undefined,
      }),
    ).toEqual({
      closeAllTabs: false,
      nextSyncedPid: 1001,
      openOwnTab: false,
    });
  });

  test("auto-opens own tab on first history route mount when no tab exists", () => {
    expect(
      resolveFocusSyncActions({
        autoOpenOwnTab: true,
        connectedHasSummoner: true,
        focusedPid: 1001,
        hasExistingTabs: false,
        lastSyncedPid: undefined,
      }),
    ).toEqual({
      closeAllTabs: false,
      nextSyncedPid: 1001,
      openOwnTab: true,
    });
  });

  test("replaces tabs when the focused client changes after initial sync", () => {
    expect(
      resolveFocusSyncActions({
        autoOpenOwnTab: true,
        connectedHasSummoner: true,
        focusedPid: 1002,
        hasExistingTabs: true,
        lastSyncedPid: 1001,
      }),
    ).toEqual({
      closeAllTabs: true,
      nextSyncedPid: 1002,
      openOwnTab: true,
    });
  });
});
