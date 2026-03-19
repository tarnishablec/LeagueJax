import { BarChart3 } from "lucide-react";
import { HistoryTabBar } from "@/features/history/components/HistoryTabBar.tsx";
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
        node: <HistoryTabBar />,
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
        history: {
          summary: {
            solo: "Solo/Duo",
            flex: "Flex",
            unranked: "Unranked",
            winsShort: "W",
            lossesShort: "L",
            lpShort: "LP",
          },
        },
      },
      "zh-CN": {
        nav: {
          history: "\u6218\u7ee9",
        },
        history: {
          summary: {
            solo: "\u5355/\u53cc\u6392",
            flex: "\u7075\u6d3b\u6392\u4f4d",
            unranked: "\u672a\u5b9a\u7ea7",
            winsShort: "\u80dc",
            lossesShort: "\u8d1f",
            lpShort: "\u80dc\u70b9",
          },
        },
      },
      "ja-JP": {
        nav: {
          history: "\u5c65\u6b74",
        },
        history: {
          summary: {
            solo: "\u30bd\u30ed/\u30c7\u30e5\u30aa",
            flex: "\u30d5\u30ec\u30c3\u30af\u30b9",
            unranked: "\u672a\u30e9\u30f3\u30af",
            winsShort: "\u52dd",
            lossesShort: "\u6557",
            lpShort: "LP",
          },
        },
      },
    };
  }
}
