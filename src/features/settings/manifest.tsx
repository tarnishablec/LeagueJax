import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { WebShard } from "@/features/runtime/web-contract";
import type { Jax } from "@/jax";
import { SHARD_IDS } from "../shard-ids";
import { SettingsRoute } from "./routes/SettingsRoute";
import { settingsApi } from "./store";
import { registerGeneralSettings } from "./store/general";
import type {
  RegisteredSetting,
  SettingClassCtor,
  SettingDefinition,
  SettingId,
  SettingsShardApi,
} from "./types";

export class SettingsShard implements WebShard, SettingsShardApi {
  public static readonly id = SHARD_IDS.SETTINGS;

  public setup(_jax: Jax): void {
    registerGeneralSettings(this);
  }

  public registerSetting(definition: SettingDefinition): void {
    settingsApi.registerSetting(definition);
  }

  public registerClass(ctor: SettingClassCtor): void {
    settingsApi.registerClass(ctor);
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
        to: "/settings/general",
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
            general: {
              title: "General",
            },
          },
          sections: {
            general: {
              preferences: {
                title: "Preferences",
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
        },
      },
      "zh-CN": {
        nav: {
          settings: "设置",
        },
        settings: {
          title: "设置",
          pages: {
            general: {
              title: "通用",
            },
          },
          sections: {
            general: {
              preferences: {
                title: "偏好",
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
        },
      },
    };
  }
}
