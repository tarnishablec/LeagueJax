import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { WebContribution } from "@/features/runtime/web-contract";
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

export class SettingsShard implements WebContribution, SettingsShardApi {
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
          settings: "\u8bbe\u7f6e",
        },
        settings: {
          title: "\u8bbe\u7f6e",
          pages: {
            general: {
              title: "\u901a\u7528",
            },
          },
          sections: {
            general: {
              preferences: {
                title: "\u504f\u597d",
              },
            },
          },
          language: {
            label: "\u8bed\u8a00",
            zhCN: "\u7b80\u4f53\u4e2d\u6587",
            en: "English",
          },
          theme: {
            label: "\u4e3b\u9898",
            system: "\u8ddf\u968f\u7cfb\u7edf",
            light: "\u6d45\u8272",
            dark: "\u6df1\u8272",
          },
        },
      },
    };
  }
}
