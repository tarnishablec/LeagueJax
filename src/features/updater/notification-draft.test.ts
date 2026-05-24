import { describe, expect, test } from "bun:test";
import type { UpdaterStateDto } from "@/bindings/updater";
import {
  buildUpdaterNotificationDraft,
  UPDATER_SETTINGS_HASH,
} from "./notification-draft";

const baseState: UpdaterStateDto = {
  kind: "idle",
  currentVersion: "0.2.1",
  latestVersion: null,
  notes: null,
  source: null,
  message: null,
};

describe("buildUpdaterNotificationDraft", () => {
  test("creates a notification draft for available updates", () => {
    const draft = buildUpdaterNotificationDraft({
      ...baseState,
      kind: "updateAvailable",
      latestVersion: "0.2.2",
    });

    expect(draft).toMatchObject({
      source: "updater",
      level: "info",
      titleKey: "settings.update.notification.available.title",
      bodyKey: "settings.update.notification.available.body",
      values: {
        currentVersion: "0.2.1",
        latestVersion: "0.2.2",
      },
      dedupeKey: "updater:0.2.1:0.2.2",
      system: "off",
    });
    expect(typeof draft?.onClick).toBe("function");
  });

  test("skips non-actionable updater states", () => {
    expect(
      buildUpdaterNotificationDraft({
        ...baseState,
        kind: "upToDate",
        latestVersion: "0.2.1",
      }),
    ).toBeNull();
    expect(
      buildUpdaterNotificationDraft({
        ...baseState,
        kind: "updateAvailable",
        latestVersion: null,
      }),
    ).toBeNull();
  });

  test("keeps the settings hash target explicit", () => {
    expect(UPDATER_SETTINGS_HASH).toBe("#/main/settings/system");
  });
});
