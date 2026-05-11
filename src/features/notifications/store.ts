import type { AppNotification, NotificationDraft } from "./types";

export type NotificationsSubscriber = () => void;

const DEFAULT_NOTIFICATION_LIMIT = 100;

export class NotificationsStore {
  private readonly subscribers = new Set<NotificationsSubscriber>();
  private notifications: AppNotification[] = [];
  private revision = 0;

  public constructor(private readonly limit = DEFAULT_NOTIFICATION_LIMIT) {}

  public list(): AppNotification[] {
    return [...this.notifications];
  }

  public version(): number {
    return this.revision;
  }

  public unreadCount(): number {
    return this.notifications.filter((item) => item.readAt == null).length;
  }

  public subscribe(subscriber: NotificationsSubscriber): () => void {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  // Dedupe keeps the original id stable so future notification-center rows can update in place.
  public publish(draft: NotificationDraft): AppNotification {
    const existing =
      draft.dedupeKey == null
        ? undefined
        : this.notifications.find((item) => item.dedupeKey === draft.dedupeKey);
    const notification: AppNotification = {
      id: existing?.id ?? crypto.randomUUID(),
      source: draft.source,
      level: draft.level,
      titleKey: draft.titleKey,
      bodyKey: draft.bodyKey,
      values: draft.values ?? {},
      dedupeKey: draft.dedupeKey,
      createdAt: draft.createdAt ?? Date.now(),
      readAt: existing?.readAt,
      system: draft.system ?? "respectUserSetting",
      systemSettingId: draft.systemSettingId,
      onClick: draft.onClick,
    };

    this.notifications =
      existing == null
        ? [notification, ...this.notifications]
        : [
            notification,
            ...this.notifications.filter((item) => item.id !== existing.id),
          ];
    this.notifications = this.notifications.slice(0, this.limit);
    this.notify();

    return notification;
  }

  public markRead(id: string, readAt = Date.now()): boolean {
    let updated = false;
    this.notifications = this.notifications.map((item) => {
      if (item.id !== id || item.readAt != null) {
        return item;
      }
      updated = true;
      return { ...item, readAt };
    });
    if (updated) {
      this.notify();
    }
    return updated;
  }

  public async activate(id: string, readAt = Date.now()): Promise<boolean> {
    const existing = this.notifications.find((item) => item.id === id);
    if (!existing) {
      return false;
    }

    this.markRead(id, readAt);
    const notification =
      this.notifications.find((item) => item.id === id) ?? existing;
    if (!notification.onClick) {
      return true;
    }

    try {
      await notification.onClick(notification);
      return true;
    } catch {
      return false;
    }
  }

  public clear(): void {
    if (this.notifications.length === 0) {
      return;
    }
    this.notifications = [];
    this.notify();
  }

  private notify(): void {
    this.revision += 1;
    for (const subscriber of this.subscribers) {
      subscriber();
    }
  }
}

export function createNotificationsStore(limit?: number): NotificationsStore {
  return new NotificationsStore(limit);
}
