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

  test("counts unread notifications and clears the list", () => {
    const store = createNotificationsStore();
    const first = store.publish({
      source: "claim-tool",
      level: "info",
      titleKey: "notifications.claimTool.available.title",
    });
    store.publish({
      source: "claim-tool",
      level: "info",
      titleKey: "notifications.claimTool.available.title",
    });

    expect(store.unreadCount()).toBe(2);
    expect(store.markRead(first.id, 300)).toBe(true);
    expect(store.unreadCount()).toBe(1);

    store.clear();

    expect(store.list()).toEqual([]);
    expect(store.unreadCount()).toBe(0);
  });

  test("activates notification callbacks and marks notifications as read", async () => {
    const store = createNotificationsStore();
    const activated: string[] = [];
    const notification = store.publish({
      source: "claim-tool",
      level: "info",
      titleKey: "notifications.claimTool.available.title",
      onClick: (item) => {
        activated.push(item.id);
      },
    });

    await expect(store.activate(notification.id, 400)).resolves.toBe(true);

    expect(activated).toEqual([notification.id]);
    expect(store.list()[0].readAt).toBe(400);
    expect(store.unreadCount()).toBe(0);
  });

  test("activates notifications without callbacks by marking them as read", async () => {
    const store = createNotificationsStore();
    const notification = store.publish({
      source: "claim-tool",
      level: "info",
      titleKey: "notifications.claimTool.available.title",
    });

    await expect(store.activate(notification.id, 500)).resolves.toBe(true);

    expect(store.list()[0].readAt).toBe(500);
  });
});
