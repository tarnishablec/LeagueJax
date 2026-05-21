import { SolidSettingsShard } from "@/features/settings/solid-settings-shard";
import { SHARD_IDS } from "@/features/shard-ids";
import type { Jax } from "@/jax";
import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { UpdaterSettingsSection } from "./components/UpdaterSettingsSection";
import { updaterI18n } from "./i18n";

const SYSTEM_UPDATE_SECTION = "system.update" as const;

export class SolidUpdaterFeature implements SolidWebShard {
  public label() {
    return "SolidUpdaterFeature";
  }

  public id() {
    return SHARD_IDS.UPDATER;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

  public setup(jax: Jax): void {
    const settings = jax.getShard(SolidSettingsShard);
    settings.registerSection({
      key: SYSTEM_UPDATE_SECTION,
      order: 30,
      renderer: UpdaterSettingsSection,
    });
  }

  public i18nResources() {
    return updaterI18n;
  }
}
