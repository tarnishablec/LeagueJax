import i18n from "i18next";
import { initializeI18n } from "@/i18n";
import { createLogger } from "@/infra/logger";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SettingsShard } from "../settings/manifest";
import {
  type Language,
  SYSTEM_LANGUAGE_SETTING_ID,
} from "../settings/store/general";
import { SHARD_IDS } from "../shard-ids";
import { collectI18nResources } from "./resources";

const logger = createLogger("i18n-shard");

export class I18nShard implements WebShard {
  private unsubscribe: (() => void) | null = null;

  public label() {
    return "I18nShard";
  }

  public id() {
    return SHARD_IDS.I18N;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS] as const;
  }

  public async setup(jax: Jax): Promise<void> {
    const settings = jax.getShard(SettingsShard);
    const language =
      settings.get<Language>(SYSTEM_LANGUAGE_SETTING_ID) ?? "zh-CN";

    logger.info({ language }, "Initializing i18n resources");
    await initializeI18n(
      collectI18nResources(jax.listShards() as WebShard[]),
      language,
    );

    this.unsubscribe = settings.subscribe(SYSTEM_LANGUAGE_SETTING_ID, () => {
      const nextLanguage =
        settings.get<Language>(SYSTEM_LANGUAGE_SETTING_ID) ?? "zh-CN";

      void this.changeLanguage(nextLanguage);
    });
  }

  public async teardown(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private async changeLanguage(language: Language): Promise<void> {
    if (i18n.language === language) {
      return;
    }

    try {
      await i18n.changeLanguage(language);
    } catch (error) {
      logger.error({ error, language }, "Failed to change i18n language");
    }
  }
}
