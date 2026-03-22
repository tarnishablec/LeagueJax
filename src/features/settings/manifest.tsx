import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Settings } from "lucide-react";
import type {
  SettingsBootstrapDto,
  SettingsChangedEventDto,
  SettingsPatchDto,
  SettingsPatchResultDto,
} from "@/bindings/settings.ts";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createLogger, setWebLogLevel } from "@/infra/logger";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { SettingsIndexRoute } from "./routes/SettingsIndexRoute";
import { SettingsPageRoute } from "./routes/SettingsPageRoute";
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
        children: [
          {
            index: true,
            element: <SettingsIndexRoute />,
          },
          {
            path: ":pageId",
            element: <SettingsPageRoute />,
          },
        ],
        order: 90,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/settings",
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
        id: "settings-language-toggle",
        node: <LanguageToggle />,
        order: 99,
      },
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
            jaJP: "Japanese",
          },
          theme: {
            label: "Theme",
            system: "System",
            light: "Light",
            dark: "Dark",
          },
          assetSource: {
            label: "Asset Source",
            cdragon: "CommunityDragon",
            ddragon: "Data Dragon",
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
          clientArgs: {
            tab: "Client Args",
            commandTitle: "Command Line",
            columns: {
              key: "Key",
              value: "Value",
            },
            empty: "No focused client.",
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
            jaJP: "Japanese",
          },
          theme: {
            label: "主题",
            system: "跟随系统",
            light: "浅色",
            dark: "深色",
          },
          assetSource: {
            label: "资源来源",
            cdragon: "CommunityDragon",
            ddragon: "Data Dragon",
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
          clientArgs: {
            tab: "客户端参数",
            commandTitle: "命令行",
            columns: {
              key: "参数",
              value: "值",
            },
            empty: "当前没有聚焦的客户端。",
          },
        },
      },
      "ja-JP": {
        nav: {
          settings: "\u8a2d\u5b9a",
        },
        settings: {
          title: "\u8a2d\u5b9a",
          pages: {
            system: {
              title: "\u30b7\u30b9\u30c6\u30e0",
            },
          },
          sections: {
            system: {
              preferences: {
                title: "\u74b0\u5883\u8a2d\u5b9a",
              },
              logging: {
                title: "\u30ed\u30b0",
              },
            },
          },
          language: {
            label: "\u8a00\u8a9e",
            zhCN: "\u7c21\u4f53\u5b57\u4e2d\u56fd\u8a9e",
            en: "\u82f1\u8a9e",
            jaJP: "\u65e5\u672c\u8a9e",
          },
          theme: {
            label: "\u30c6\u30fc\u30de",
            system: "\u30b7\u30b9\u30c6\u30e0",
            light: "\u30e9\u30a4\u30c8",
            dark: "\u30c0\u30fc\u30af",
          },
          assetSource: {
            label: "\u30a2\u30bb\u30c3\u30c8\u30bd\u30fc\u30b9",
            cdragon: "CommunityDragon",
            ddragon: "Data Dragon",
          },
          logging: {
            level: {
              label: "\u30ed\u30b0\u30ec\u30d9\u30eb",
            },
            levelDebug: "\u30c7\u30d0\u30c3\u30b0",
            levelInfo: "\u60c5\u5831",
            levelWarn: "\u8b66\u544a",
            levelError: "\u30a8\u30e9\u30fc",
          },
          registry: {
            tab: "\u30ec\u30b8\u30b9\u30c8\u30ea",
            columns: {
              key: "\u30ad\u30fc",
              zh: "\u4e2d\u56fd\u8a9e",
              en: "\u82f1\u8a9e",
              scope: "\u30b9\u30b3\u30fc\u30d7",
            },
          },
          clientArgs: {
            tab: "\u30af\u30e9\u30a4\u30a2\u30f3\u30c8\u5f15\u6570",
            commandTitle: "\u30b3\u30de\u30f3\u30c9\u30e9\u30a4\u30f3",
            columns: {
              key: "\u30ad\u30fc",
              value: "\u5024",
            },
            empty:
              "\u30d5\u30a9\u30fc\u30ab\u30b9\u4e2d\u306e\u30af\u30e9\u30a4\u30a2\u30f3\u30c8\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
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
