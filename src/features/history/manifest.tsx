import { BarChart3 } from "lucide-react";
import { TabBar } from "@/components/TabBar";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { useLcuStore } from "@/stores/lcu";
import { useTabStore } from "@/stores/tabs";
import { SHARD_IDS } from "../shard-ids";
import { HistoryToolbar } from "./components/HistoryToolbar";
import { HistoryRoute } from "./routes/HistoryRoute";

export class HistoryShard implements WebShard {
  public id() {
    return SHARD_IDS.HISTORY;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

  public setup(_jax: Jax): void {
    void useTabStore.getState();
    void useLcuStore.getState();
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
        node: <TabBar />,
        order: 10,
        routes: ["/history"],
      },
    ];
  }

  public i18nResources() {
    return {
      en: {
        nav: {
          history: "History",
        },
      },
      "zh-CN": {
        nav: {
          history: "\u6218\u7ee9",
        },
      },
    };
  }
}
