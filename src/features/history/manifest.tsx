import { BarChart3 } from "lucide-react";
import { lazy, Suspense } from "react";
import { z } from "zod";
import { HistoryTabBar } from "@/features/history/components/HistoryTabBar.tsx";
import { SettingsShard } from "@/features/settings/manifest";
import { StaticCacheShard } from "@/features/static-cache/manifest";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { useLcuStore } from "@/stores/lcu";
import { useTabStore } from "@/stores/tabs";
import { SHARD_IDS } from "../shard-ids";
import { HistoryToolbar } from "./components/HistoryToolbar";
import { historyI18n } from "./i18n";

const HistoryRoute = lazy(() =>
  import("./routes/HistoryRoute").then((module) => ({
    default: module.HistoryRoute,
  })),
);
export const HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING =
  "history.behavior.autoRefreshOnTabSwitch";

export const HISTORY_AUTO_OPEN_OWN_TAB_SETTING =
  "history.behavior.autoOpenOwnTab";
export const HISTORY_SHOW_AUGMENT_DETAILS_SETTING =
  "history.display.showAugmentDetails";
const HISTORY_BEHAVIOR_SECTION = "history.behavior" as const;
const HISTORY_DISPLAY_SECTION = "history.display" as const;

export class HistoryShard implements WebShard {
  public label() {
    return "HistoryShard";
  }

  public id() {
    return SHARD_IDS.HISTORY;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS, SHARD_IDS.STATIC_CACHE];
  }

  public setup(jax: Jax): void {
    void useTabStore.getState();
    void useLcuStore.getState();

    const settingsShard = jax.getShard(SettingsShard);
    void jax.getShard(StaticCacheShard);
    settingsShard.registerPage({ id: "history", order: 20 });
    settingsShard.registerSection({ key: HISTORY_BEHAVIOR_SECTION, order: 10 });
    settingsShard.registerSection({ key: HISTORY_DISPLAY_SECTION, order: 20 });

    settingsShard.registerSetting({
      id: HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING,
      labelKey: "settings.history.autoRefreshOnTabSwitch.label",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: false,
      order: 10,
      onSet: () => {},
    });

    settingsShard.registerSetting({
      id: HISTORY_AUTO_OPEN_OWN_TAB_SETTING,
      labelKey: "settings.history.autoOpenOwnTab.label",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: true,
      order: 11,
      onSet: () => {},
    });

    settingsShard.registerSetting({
      id: HISTORY_SHOW_AUGMENT_DETAILS_SETTING,
      labelKey: "settings.history.showAugmentDetails.label",
      hintKey: "settings.history.showAugmentDetails.hint",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: false,
      order: 20,
      onSet: () => {},
    });
  }

  public routes() {
    return [
      {
        path: "history",
        element: (
          <Suspense fallback={null}>
            <HistoryRoute />
          </Suspense>
        ),
        order: 10,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/main/history",
        labelKey: "nav.history",
        icon: BarChart3,
        section: "main" as const,
        order: 10,
      },
    ];
  }

  public toolbarSlots() {
    return [
      {
        id: "history-search",
        node: <HistoryToolbar />,
        order: 10,
        routes: ["/main/history"],
      },
    ];
  }

  public titlebarSlots() {
    return [
      {
        id: "history-tabs",
        node: <HistoryTabBar />,
        order: 10,
        routes: ["/main/history"],
      },
    ];
  }

  public i18nResources() {
    return historyI18n;
  }
}
