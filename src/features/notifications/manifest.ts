import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import i18n from "i18next";
import { createLogger } from "@/infra/logger";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import type { SettingsShardApi } from "../settings/types";
import { SHARD_IDS } from "../shard-ids";
import { createNotificationsStore, type NotificationsStore } from "./store";
import type { AppNotification, NotificationDraft } from "./types";

const logger = createLogger("notifications-shard");

export class NotificationsShard implements WebShard {
  private readonly store = createNotificationsStore();
  private settings: SettingsShardApi | null = null;
  private permissionRequest: Promise<boolean> | null = null;

  public label() {
    return "NotificationsShard";
  }

  public id() {
    return SHARD_IDS.NOTIFICATIONS;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS, SHARD_IDS.I18N] as const;
  }

  public setup(jax: Jax): void {
    this.settings = jax.getShardById(
      SHARD_IDS.SETTINGS,
    ) as unknown as SettingsShardApi;
  }

  public teardown(): void {
    this.settings = null;
    this.permissionRequest = null;
  }

  public notifications(): NotificationsStore {
    return this.store;
  }

  public publish(draft: NotificationDraft): AppNotification {
    const notification = this.store.publish(draft);
    void this.maybeSendSystemNotification(notification);
    return notification;
  }

  private shouldSendSystemNotification(notification: AppNotification): boolean {
    if (notification.system === "off") {
      return false;
    }

    if (notification.system === "force") {
      return true;
    }

    if (!notification.systemSettingId || !this.settings) {
      return false;
    }

    return this.settings.get<boolean>(notification.systemSettingId) === true;
  }

  private async maybeSendSystemNotification(
    notification: AppNotification,
  ): Promise<void> {
    if (!this.shouldSendSystemNotification(notification)) {
      return;
    }

    try {
      const permissionGranted = await this.ensurePermissionGranted();
      if (!permissionGranted) {
        logger.debug(
          { source: notification.source },
          "System notification skipped because permission was not granted",
        );
        return;
      }

      const title = String(i18n.t(notification.titleKey, notification.values));
      const body =
        notification.bodyKey == null
          ? undefined
          : String(i18n.t(notification.bodyKey, notification.values));
      sendNotification(body == null ? { title } : { title, body });
    } catch (error) {
      logger.warn(
        { error, source: notification.source },
        "Failed to send system notification",
      );
    }
  }

  private async ensurePermissionGranted(): Promise<boolean> {
    if (await isPermissionGranted()) {
      return true;
    }

    this.permissionRequest ??= requestPermission()
      .then((permission) => permission === "granted")
      .finally(() => {
        this.permissionRequest = null;
      });

    return this.permissionRequest;
  }
}
