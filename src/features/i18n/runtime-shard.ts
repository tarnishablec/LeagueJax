import { invoke } from "@tauri-apps/api/core";
import {
  disposeSolidI18n,
  getSolidI18n,
  initializeSolidI18n,
} from "@/i18n/solid";
import type { LocaleResource } from "@/i18n/types";
import { createLogger } from "@/infra/logger";
import type { Jax } from "@/jax";
import type {
  SolidToolbarSlot,
  SolidWebShard,
} from "@/runtime/solid-web-contract";
import type { SettingsShardApi } from "../settings/types";
import { SHARD_IDS } from "../shard-ids";
import { LanguageToggle } from "./components/LanguageToggle";
import { i18nShardI18n } from "./i18n";
import {
  createLanguageSettingDefinition,
  DEFAULT_LANGUAGE,
  type Language,
  languageFromSystemLocale,
  SYSTEM_LANGUAGE_SETTING_ID,
} from "./locale";
import { collectI18nResources } from "./resources";

const logger = createLogger("i18n-runtime-shard");

export class I18nRuntimeShard implements SolidWebShard {
  private unsubscribe: (() => void) | null = null;
  private defaultLanguage: Language = DEFAULT_LANGUAGE;

  public label() {
    return "I18nRuntimeShard";
  }

  public id() {
    return SHARD_IDS.I18N;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS] as const;
  }

  public async setup(jax: Jax): Promise<void> {
    const settings = jax.getShardById(
      SHARD_IDS.SETTINGS,
    ) as unknown as SettingsShardApi;
    this.defaultLanguage = await this.resolveDefaultLanguage();
    settings.registerSetting(
      createLanguageSettingDefinition(this.defaultLanguage),
    );

    const language = this.getLanguage(settings);
    const resources = collectI18nResources(jax.listShards() as SolidWebShard[]);

    logger.info({ language }, "Initializing i18n resources");
    await this.initializeRuntimeI18n(resources, language);

    this.unsubscribe = settings.subscribe(SYSTEM_LANGUAGE_SETTING_ID, () => {
      const nextLanguage = this.getLanguage(settings);

      void this.changeLanguage(nextLanguage);
    });
  }

  public i18nResources() {
    return i18nShardI18n;
  }

  public toolbarSlots(): SolidToolbarSlot[] {
    return [
      {
        id: "i18n-language-toggle",
        node: LanguageToggle(),
        order: 99,
        routes: ["*"],
      },
    ];
  }

  public teardown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    disposeSolidI18n();
  }

  protected initializeRuntimeI18n(
    resources: LocaleResource,
    language: Language,
  ): Promise<void> | void {
    initializeSolidI18n(resources, language);
  }

  protected changeRuntimeLanguage(language: Language): Promise<void> | void {
    getSolidI18n().setLanguage(language);
  }

  private async changeLanguage(language: Language): Promise<void> {
    await this.changeRuntimeLanguage(language);
  }

  private getLanguage(settings: SettingsShardApi): Language {
    return (
      settings.get<Language>(SYSTEM_LANGUAGE_SETTING_ID) ?? this.defaultLanguage
    );
  }

  private async resolveDefaultLanguage(): Promise<Language> {
    try {
      const systemLocale = await invoke<string | null>("get_system_locale");
      return languageFromSystemLocale(systemLocale);
    } catch (error) {
      logger.warn(
        { error },
        "Failed to read system locale, falling back to English",
      );
      return DEFAULT_LANGUAGE;
    }
  }
}
