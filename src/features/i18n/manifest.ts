import i18n from "i18next";
import { createElement } from "react";
import { LanguageToggle } from "@/features/i18n/components/LanguageToggle";
import { initializeI18n } from "@/i18n";
import { createLogger } from "@/infra/logger";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SettingsShard } from "../settings/manifest";
import { SHARD_IDS } from "../shard-ids";
import { i18nShardI18n } from "./i18n";
import {
  DEFAULT_LANGUAGE,
  detectSystemLanguage,
  LANGUAGE_SETTING_DEFINITION,
  type Language,
  SYSTEM_LANGUAGE_SETTING_ID,
} from "./locale";
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
    settings.registerSetting(LANGUAGE_SETTING_DEFINITION);
    this.applyInitialLanguagePreference(settings);

    const language = this.getLanguage(settings);

    logger.info({ language }, "Initializing i18n resources");
    await initializeI18n(
      collectI18nResources(jax.listShards() as WebShard[]),
      language,
    );

    this.unsubscribe = settings.subscribe(SYSTEM_LANGUAGE_SETTING_ID, () => {
      const nextLanguage = this.getLanguage(settings);

      void this.changeLanguage(nextLanguage);
    });
  }

  public toolbarSlots() {
    return [
      {
        id: "i18n-language-toggle",
        node: createElement(LanguageToggle),
        order: 99,
      },
    ];
  }

  public i18nResources() {
    return i18nShardI18n;
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

  private applyInitialLanguagePreference(settings: SettingsShard): void {
    if (
      settings.hasPersistedSnapshot() ||
      settings.hasBootstrapSnapshotValue(SYSTEM_LANGUAGE_SETTING_ID)
    ) {
      return;
    }

    settings.set(SYSTEM_LANGUAGE_SETTING_ID, detectSystemLanguage());
  }

  private getLanguage(settings: SettingsShard): Language {
    return (
      settings.get<Language>(SYSTEM_LANGUAGE_SETTING_ID) ?? DEFAULT_LANGUAGE
    );
  }
}
