import { describe, expect, test } from "bun:test";
import { createNotificationsStore } from "./store";

describe("createNotificationsStore", () => {
  test("adds notifications newest first", () => {
    const store = createNotificationsStore();

    const first = store.publish({
      source: "claim-tool",
      level: "info",
      titleKey: "notifications.claimTool.available.title",
      bodyKey: "notifications.claimTool.available.body",
      createdAt: 100,
    });
    const second = store.publish({
      source: "claim-tool",
      level: "warning",
      titleKey: "notifications.claimTool.skipped.title",
      bodyKey: "notifications.claimTool.skipped.body",
      createdAt: 200,
    });

    expect(store.list().map((item) => item.id)).toEqual([second.id, first.id]);
  });

  test("replaces older notification with the same dedupe key", () => {
    const store = createNotificationsStore();

    const first = store.publish({
      source: "claim-tool",
      level: "info",
      titleKey: "notifications.claimTool.available.title",
      bodyKey: "notifications.claimTool.available.body",
      values: { count: 1 },
      dedupeKey: "claim-tool:reward-1",
      createdAt: 100,
    });
    const second = store.publish({
      source: "claim-tool",
      level: "info",
      titleKey: "notifications.claimTool.available.title",
      bodyKey: "notifications.claimTool.available.body",
      values: { count: 2 },
      dedupeKey: "claim-tool:reward-1",
      createdAt: 200,
    });

    expect(store.list()).toHaveLength(1);
    expect(store.list()[0]).toMatchObject({
      id: first.id,
      values: { count: 2 },
      createdAt: 200,
    });
    expect(second.id).toBe(first.id);
  });

  test("keeps separate notifications without dedupe keys", () => {
    const store = createNotificationsStore();

    store.publish({
      source: "claim-tool",
      level: "info",
      titleKey: "notifications.claimTool.available.title",
      bodyKey: "notifications.claimTool.available.body",
    });
    store.publish({
      source: "claim-tool",
      level: "info",
      titleKey: "notifications.claimTool.available.title",
      bodyKey: "notifications.claimTool.available.body",
    });

    expect(store.list()).toHaveLength(2);
  });
});
