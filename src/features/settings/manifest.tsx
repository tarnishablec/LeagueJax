import { Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle.tsx";
import type { WebShard } from "@/jax/shard/web-shard.ts";
import { Settings as SettingsRoute } from "@/routes/settings.tsx";
import { useAppStore } from "@/stores/app";
import { useThemeStore } from "@/stores/theme";
import { SHARD_IDS } from "../shard-ids";
import { GeneralSettingsSection } from "./components/GeneralSettingsSection";

export const settingsShard: WebShard = {
  id: () => SHARD_IDS.SETTINGS,
  setupStores: () => {
    void useThemeStore.getState();
    void useAppStore.getState();
  },
  routes: () => [
    {
      path: "settings",
      element: <SettingsRoute />,
      order: 90,
    },
  ],
  navItems: () => [
    {
      to: "/settings",
      labelKey: "nav.settings",
      icon: Settings,
      section: "bottom",
      order: 10,
    },
  ],
  toolbarSlots: () => [
    {
      id: "settings-theme-toggle",
      node: <ThemeToggle />,
      order: 100,
    },
  ],
  settingsSections: () => [
    {
      id: "settings-general",
      titleKey: "settings.general.title",
      node: <GeneralSettingsSection />,
      order: 10,
    },
  ],
  i18nResources: () => ({
    en: {
      nav: {
        settings: "Settings",
      },
      settings: {
        title: "Settings",
        general: {
          title: "General",
        },
        language: {
          label: "Language",
        },
        theme: {
          label: "Theme",
        },
      },
    },
    "zh-CN": {
      nav: {
        settings: "设置",
      },
      settings: {
        title: "设置",
        general: {
          title: "通用",
        },
        language: {
          label: "语言",
        },
        theme: {
          label: "主题",
        },
      },
    },
  }),
};
