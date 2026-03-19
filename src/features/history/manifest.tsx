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
          modeLabel: "Mode",
          pageSizeLabel: "Page Size",
          filterLabel: "Filter",
          pageNumber: "Page {{page}}",
          mode: {
            all: "All Modes",
            q420: "Solo/Duo",
            q430: "Normal Blind",
            q440: "Ranked Flex",
            q450: "ARAM",
            q480: "Normal Draft",
            q1700: "Arena",
            q490: "Quickplay",
            q1900: "URF",
            q900: "ARURF",
            q2300: "Intro Bots",
          },
          filter: {
            all: "All (Placeholder)",
            presetA: "Preset A (Placeholder)",
            presetB: "Preset B (Placeholder)",
          },
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
          modeLabel: "\u6a21\u5f0f",
          pageSizeLabel: "\u6bcf\u9875",
          filterLabel: "\u7b5b\u9009",
          pageNumber: "\u7b2c {{page}} \u9875",
          mode: {
            all: "\u5168\u90e8\u6a21\u5f0f",
            q420: "\u5355/\u53cc\u6392\u4f4d",
            q430: "\u5339\u914d\u76f2\u9009",
            q440: "\u7075\u6d3b\u6392\u4f4d",
            q450: "\u6781\u5730\u5927\u4e71\u6597",
            q480: "\u5339\u914d\u5f81\u53ec",
            q1700: "\u6597\u9b42\u7ade\u6280\u573a",
            q490: "\u5feb\u901f\u6a21\u5f0f",
            q1900: "\u65e0\u9650\u4e71\u6597",
            q900: "\u968f\u673a\u65e0\u9650\u4e71\u6597",
            q2300: "\u65b0\u624b\u4eba\u673a",
          },
          filter: {
            all: "\u5168\u90e8\uff08\u5360\u4f4d\uff09",
            presetA: "\u9884\u8bbe A\uff08\u5360\u4f4d\uff09",
            presetB: "\u9884\u8bbe B\uff08\u5360\u4f4d\uff09",
          },
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
          modeLabel: "\u30e2\u30fc\u30c9",
          pageSizeLabel: "\u4ef6\u6570",
          filterLabel: "\u30d5\u30a3\u30eb\u30bf\u30fc",
          pageNumber: "{{page}}\u30da\u30fc\u30b8",
          mode: {
            all: "\u3059\u3079\u3066",
            q420: "\u30bd\u30ed/\u30c7\u30e5\u30aa",
            q430: "\u30ce\u30fc\u30de\u30eb\uff08\u30d6\u30e9\u30a4\u30f3\u30c9\uff09",
            q440: "\u30e9\u30f3\u30af\uff08\u30d5\u30ec\u30c3\u30af\u30b9\uff09",
            q450: "ARAM",
            q480: "\u30ce\u30fc\u30de\u30eb\uff08\u30c9\u30e9\u30d5\u30c8\uff09",
            q1700: "\u30a2\u30ea\u30fc\u30ca",
            q490: "\u30af\u30a4\u30c3\u30af\u30d7\u30ec\u30a4",
            q1900: "URF",
            q900: "ARURF",
            q2300: "\u5165\u9580\u30dc\u30c3\u30c8",
          },
          filter: {
            all: "\u3059\u3079\u3066\uff08\u30d7\u30ec\u30fc\u30b9\u30db\u30eb\u30c0\u30fc\uff09",
            presetA:
              "\u30d7\u30ea\u30bb\u30c3\u30c8A\uff08\u30d7\u30ec\u30fc\u30b9\u30db\u30eb\u30c0\u30fc\uff09",
            presetB:
              "\u30d7\u30ea\u30bb\u30c3\u30c8B\uff08\u30d7\u30ec\u30fc\u30b9\u30db\u30eb\u30c0\u30fc\uff09",
          },
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
