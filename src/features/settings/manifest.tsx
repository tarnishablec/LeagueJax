import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Settings } from "lucide-react";
import type {
  SettingsBootstrapDto,
  SettingsChangedEventDto,
  SettingsPatchDto,
  SettingsPatchResultDto,
} from "@/bindings/settings.ts";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createLogger, setWebLogLevel } from "@/infra/logger";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { SettingsRoute } from "./routes/SettingsRoute";
import { settingsApi } from "./store";
import { registerGeneralSettings } from "./store/general";
import type {
  HydrateOptions,
  RegisteredSetting,
  SettingClassCtor,
  SettingDefinition,
  SettingId,
  SettingsPatchSender,
  SettingsShardApi,
} from "./types";

const SHARED_LOG_LEVEL_SETTING_ID = "system.logging.level";

export class SettingsShard implements WebShard, SettingsShardApi {
  private readonly sourceId = `web-${crypto.randomUUID()}`;
  private changedUnlisten: UnlistenFn | null = null;
  private patchQueue = Promise.resolve();
  private readonly logger = createLogger("settings-shard");

  public id() {
    return SHARD_IDS.SETTINGS;
  }

  public async setup(_jax: Jax): Promise<void> {
    registerGeneralSettings(this);

    settingsApi.configureRemotePatchSender((changes) => {
      this.patchQueue = this.patchQueue
        .then(() => this.pushPatch(changes))
        .catch((error: unknown) => {
          this.logger.error({ error }, "Failed to sync settings patch");
        });
    });

    await this.refreshFromBackend({ notify: false, runOnSet: false });

    const currentLogLevel = settingsApi.get<string>(
      SHARED_LOG_LEVEL_SETTING_ID,
    );
    setWebLogLevel(currentLogLevel);

    this.changedUnlisten = await listen<SettingsChangedEventDto>(
      "settings_changed",
      (event) => {
        if (event.payload.source === this.sourceId) {
          return;
        }

        settingsApi.applyRemotePatch(
          event.payload.changes,
          Number(event.payload.version),
        );
      },
    );
  }

  public teardown(): void {
    if (this.changedUnlisten) {
      this.changedUnlisten();
      this.changedUnlisten = null;
    }
    settingsApi.configureRemotePatchSender(null);
  }

  public registerSetting(definition: SettingDefinition): void {
    settingsApi.registerSetting(definition);
  }

  public registerClass(ctor: SettingClassCtor): void {
    settingsApi.registerClass(ctor);
  }

  public mergeRemoteDefinitions(
    definitions: SettingsBootstrapDto["definitions"],
  ): void {
    settingsApi.mergeRemoteDefinitions(definitions);
  }

  public hydrateFromSnapshot(
    snapshot: SettingsBootstrapDto["snapshot"],
    options?: HydrateOptions,
  ): void {
    settingsApi.hydrateFromSnapshot(snapshot, options);
  }

  public applyRemotePatch(
    changes: Record<string, unknown>,
    version: number,
  ): void {
    settingsApi.applyRemotePatch(changes, version);
  }

  public configureRemotePatchSender(sender: SettingsPatchSender | null): void {
    settingsApi.configureRemotePatchSender(sender);
  }

  public getVersion(): number {
    return settingsApi.getVersion();
  }

  public setVersion(version: number): void {
    settingsApi.setVersion(version);
  }

  public get<T = unknown>(id: SettingId): T {
    return settingsApi.get<T>(id);
  }

  public set<T = unknown>(id: SettingId, value: T): boolean {
    return settingsApi.set(id, value);
  }

  public subscribe(id: SettingId, callback: () => void): () => void {
    return settingsApi.subscribe(id, callback);
  }

  public listDefinitions(): RegisteredSetting[] {
    return settingsApi.listDefinitions();
  }

  public routes() {
    return [
      {
        path: "settings",
        element: <SettingsRoute />,
        order: 90,
      },
      {
        path: "settings/:pageId",
        element: <SettingsRoute />,
        order: 91,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/settings/system",
        labelKey: "nav.settings",
        icon: Settings,
        section: "bottom" as const,
        order: 10,
      },
    ];
  }

  public toolbarSlots() {
    return [
      {
        id: "settings-theme-toggle",
        node: <ThemeToggle />,
        order: 100,
      },
    ];
  }

  public i18nResources() {
    return {
      en: {
        nav: {
          settings: "Settings",
        },
        settings: {
          title: "Settings",
          pages: {
            system: {
              title: "System",
            },
          },
          sections: {
            system: {
              preferences: {
                title: "Preferences",
              },
              logging: {
                title: "Logging",
              },
            },
          },
          language: {
            label: "Language",
            zhCN: "Simplified Chinese",
            en: "English",
          },
          theme: {
            label: "Theme",
            system: "System",
            light: "Light",
            dark: "Dark",
          },
          logging: {
            level: {
              label: "Log Level",
            },
            levelDebug: "Debug",
            levelInfo: "Info",
            levelWarn: "Warn",
            levelError: "Error",
          },
          registry: {
            tab: "Registry",
            columns: {
              key: "Key",
              zh: "Chinese",
              en: "English",
              scope: "Scope",
            },
          },
        },
      },
      "zh-CN": {
        nav: {
          settings: "设置",
        },
        settings: {
          title: "设置",
          pages: {
            system: {
              title: "系统",
            },
          },
          sections: {
            system: {
              preferences: {
                title: "偏好",
              },
              logging: {
                title: "日志",
              },
            },
          },
          language: {
            label: "语言",
            zhCN: "简体中文",
            en: "English",
          },
          theme: {
            label: "主题",
            system: "跟随系统",
            light: "浅色",
            dark: "深色",
          },
          logging: {
            level: {
              label: "日志等级",
            },
            levelDebug: "调试",
            levelInfo: "信息",
            levelWarn: "警告",
            levelError: "错误",
          },
          registry: {
            tab: "注册表",
            columns: {
              key: "键",
              zh: "中文",
              en: "英文",
              scope: "作用域",
            },
          },
        },
      },
    };
  }

  private async refreshFromBackend(options: {
    notify: boolean;
    runOnSet: boolean;
  }): Promise<void> {
    const bootstrap = await invoke<SettingsBootstrapDto>(
      "get_settings_bootstrap",
    );
    settingsApi.mergeRemoteDefinitions(bootstrap.definitions);
    settingsApi.hydrateFromSnapshot(bootstrap.snapshot, options);
  }

  private async pushPatch(changes: Record<string, unknown>): Promise<void> {
    const patch: SettingsPatchDto = {
      changes,
      expectedVersion: settingsApi.getVersion(),
      source: this.sourceId,
    };

    try {
      const result = await invoke<SettingsPatchResultDto>(
        "apply_settings_patch",
        {
          patch,
        },
      );
      settingsApi.setVersion(Number(result.snapshot.version));
    } catch (error) {
      this.logger.warn(
        { error },
        "Settings patch rejected, refreshing from backend snapshot",
      );
      await this.refreshFromBackend({ notify: true, runOnSet: true });
    }
  }
}
