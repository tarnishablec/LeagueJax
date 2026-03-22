import { BarChart3 } from "lucide-react";
import { z } from "zod";
import { HistoryTabBar } from "@/features/history/components/HistoryTabBar.tsx";
import { SettingsShard } from "@/features/settings/manifest";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { useLcuStore } from "@/stores/lcu";
import { useTabStore } from "@/stores/tabs";
import { SHARD_IDS } from "../shard-ids";
import { HistoryToolbar } from "./components/HistoryToolbar";
import { historyI18n } from "./i18n";
import { HistoryRoute } from "./routes/HistoryRoute";
export const HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING =
  "history.behavior.autoRefreshOnTabSwitch";

export class HistoryShard implements WebShard {
  public id() {
    return SHARD_IDS.HISTORY;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

  public setup(jax: Jax): void {
    void useTabStore.getState();
    void useLcuStore.getState();

    jax.getShard(SettingsShard).registerSetting({
      id: HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING,
      labelKey: "settings.history.autoRefreshOnTabSwitch.label",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: false,
      order: 10,
      onSet: () => {},
    });
  }

  public routes() {
    return [
      {
        path: "history",
        element: <HistoryRoute />,
        order: 10,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/history",
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
        routes: ["/history"],
      },
    ];
  }

  public titlebarSlots() {
    return [
      {
        id: "history-tabs",
        node: <HistoryTabBar />,
        order: 10,
        routes: ["/history"],
      },
    ];
  }

  public i18nResources() {
    return historyI18n;
  }
}
