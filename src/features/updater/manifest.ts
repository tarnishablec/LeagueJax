import { SolidNotificationsShard } from "@/features/notifications/manifest";
import { SolidSettingsShard } from "@/features/settings/solid-settings-shard";
import { SHARD_IDS } from "@/features/shard-ids";
import type { Jax } from "@/jax";
import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { UpdaterSettingsSection } from "./components/UpdaterSettingsSection";
import { updaterI18n } from "./i18n";
import { setupUpdaterNotifications } from "./notifications";

const SYSTEM_UPDATE_SECTION = "system.update" as const;

export class SolidUpdaterFeature implements SolidWebShard {
  private updaterNotificationsUnlisten: (() => void) | null = null;

  public label() {
    return "SolidUpdaterFeature";
  }

  public id() {
    return SHARD_IDS.UPDATER;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS, SHARD_IDS.NOTIFICATIONS] as const;
  }

  public async setup(jax: Jax): Promise<void> {
    const settings = jax.getShard(SolidSettingsShard);
    const notifications = jax.getShard(SolidNotificationsShard);
    settings.registerSection({
      key: SYSTEM_UPDATE_SECTION,
      order: 30,
      renderer: UpdaterSettingsSection,
    });
    this.updaterNotificationsUnlisten =
      await setupUpdaterNotifications(notifications);
  }

  public teardown(): void {
    this.updaterNotificationsUnlisten?.();
    this.updaterNotificationsUnlisten = null;
  }

  public i18nResources() {
    return updaterI18n;
  }
}
