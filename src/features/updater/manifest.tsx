import { SettingsShard } from "@/features/settings/manifest";
import type { SettingsSectionKey } from "@/features/settings/types";
import { SHARD_IDS } from "@/features/shard-ids";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { UpdaterSettingsSection } from "./components/UpdaterSettingsSection";
import { updaterI18n } from "./i18n";

const UPDATE_SECTION_KEY =
  "system.update" as const satisfies SettingsSectionKey;

export class UpdaterFeature implements WebShard {
  public label() {
    return "UpdaterFeature";
  }

  public id() {
    return SHARD_IDS.UPDATER;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS] as const;
  }

  public async setup(jax: Jax): Promise<void> {
    const settings = jax.getShard(SettingsShard);
    settings.registerSection({
      key: UPDATE_SECTION_KEY,
      order: 20,
      renderer: (props) => <UpdaterSettingsSection {...props} />,
    });
  }

  public i18nResources() {
    return updaterI18n;
  }
}
