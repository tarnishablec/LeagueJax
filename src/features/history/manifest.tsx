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
          refresh: "Refresh",
          refreshAria: "Refresh match history",
          pageNumber: "Page {{page}}",
          victory: "Victory",
          defeat: "Defeat",
          blueTeam: "Blue Team",
          redTeam: "Red Team",
          noMatches: "No matches found",
          noMatchesInFilter: "No matches found in this queue",
          loadFailed: "Failed to load match history",
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
            unknown: "Queue {{queueId}}",
          },
          map: {
            summonersRift: "Summoner's Rift",
            howlingAbyss: "Howling Abyss",
            nexusBlitz: "Nexus Blitz",
            arena: "Arena",
            unknown: "Map {{mapId}}",
          },
          runeStyle: {
            precision: "Precision",
            domination: "Domination",
            sorcery: "Sorcery",
            inspiration: "Inspiration",
            resolve: "Resolve",
            unknown: "Style {{styleId}}",
          },
          filter: {
            all: "All (Placeholder)",
            presetA: "Preset A (Placeholder)",
            presetB: "Preset B (Placeholder)",
          },
          match: {
            duration: "Duration",
            startedAt: "Start",
            csShort: "CS",
            damage: "Damage",
            damageShare: "Damage Share",
            spells: "Spells",
            runes: "Runes",
            items: "Items",
            primaryRune: "Primary rune",
            secondaryRuneStyle: "Secondary rune style",
            unknownSpell: "Spell {{id}}",
            itemAlt: "Item {{id}}",
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
          refresh: "\u5237\u65b0",
          refreshAria: "\u5237\u65b0\u6218\u7ee9",
          pageNumber: "\u7b2c {{page}} \u9875",
          victory: "\u80dc\u5229",
          defeat: "\u5931\u8d25",
          blueTeam: "\u84dd\u8272\u65b9",
          redTeam: "\u7ea2\u8272\u65b9",
          noMatches: "\u6682\u65e0\u6218\u7ee9",
          noMatchesInFilter: "\u5f53\u524d\u961f\u5217\u6682\u65e0\u6218\u7ee9",
          loadFailed: "\u6218\u7ee9\u52a0\u8f7d\u5931\u8d25",
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
            unknown: "\u961f\u5217 {{queueId}}",
          },
          map: {
            summonersRift: "\u53ec\u5524\u5e08\u5ce1\u8c37",
            howlingAbyss: "\u568e\u54ed\u6df1\u6e0a",
            nexusBlitz: "\u6781\u9650\u95ea\u51fb",
            arena: "\u6597\u9b42\u7ade\u6280\u573a",
            unknown: "\u5730\u56fe {{mapId}}",
          },
          runeStyle: {
            precision: "\u7cbe\u5bc6",
            domination: "\u4e3b\u5bb0",
            sorcery: "\u5deb\u672f",
            inspiration: "\u542f\u8fea",
            resolve: "\u575a\u51b3",
            unknown: "\u7cfb\u522b {{styleId}}",
          },
          filter: {
            all: "\u5168\u90e8\uff08\u5360\u4f4d\uff09",
            presetA: "\u9884\u8bbe A\uff08\u5360\u4f4d\uff09",
            presetB: "\u9884\u8bbe B\uff08\u5360\u4f4d\uff09",
          },
          match: {
            duration: "\u65f6\u957f",
            startedAt: "\u5f00\u59cb",
            csShort: "\u8865\u5175",
            damage: "\u4f24\u5bb3",
            damageShare: "\u4f24\u5bb3\u5360\u6bd4",
            spells: "\u53ec\u5524\u5e08\u6280\u80fd",
            runes: "\u7b26\u6587",
            items: "\u88c5\u5907",
            primaryRune: "\u4e3b\u7cfb\u7b2c\u4e00\u7b26\u6587",
            secondaryRuneStyle: "\u526f\u7cfb\u7b26\u6587",
            unknownSpell: "\u6280\u80fd {{id}}",
            itemAlt: "\u88c5\u5907 {{id}}",
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
          refresh: "\u66f4\u65b0",
          refreshAria: "\u5bfe\u6226\u5c65\u6b74\u3092\u66f4\u65b0",
          pageNumber: "{{page}}\u30da\u30fc\u30b8",
          victory: "\u52dd\u5229",
          defeat: "\u6557\u5317",
          blueTeam: "\u30d6\u30eb\u30fc\u30c1\u30fc\u30e0",
          redTeam: "\u30ec\u30c3\u30c9\u30c1\u30fc\u30e0",
          noMatches:
            "\u5bfe\u6226\u30c7\u30fc\u30bf\u304c\u3042\u308a\u307e\u305b\u3093",
          noMatchesInFilter:
            "\u3053\u306e\u30ad\u30e5\u30fc\u3067\u306f\u5bfe\u6226\u30c7\u30fc\u30bf\u304c\u3042\u308a\u307e\u305b\u3093",
          loadFailed:
            "\u5bfe\u6226\u5c65\u6b74\u306e\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f",
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
            unknown: "\u30ad\u30e5\u30fc {{queueId}}",
          },
          map: {
            summonersRift: "\u30b5\u30e2\u30ca\u30fc\u30ba\u30ea\u30d5\u30c8",
            howlingAbyss: "\u30cf\u30a6\u30ea\u30f3\u30b0\u30a2\u30d3\u30b9",
            nexusBlitz: "\u30cd\u30af\u30b5\u30b9\u30d6\u30ea\u30c3\u30c4",
            arena: "\u30a2\u30ea\u30fc\u30ca",
            unknown: "\u30de\u30c3\u30d7 {{mapId}}",
          },
          runeStyle: {
            precision: "\u6839\u6027",
            domination: "\u89aa\u914d",
            sorcery: "\u9b54\u8853",
            inspiration: "\u5553\u660e",
            resolve: "\u4e0d\u6ec5",
            unknown: "\u30b9\u30bf\u30a4\u30eb {{styleId}}",
          },
          filter: {
            all: "\u3059\u3079\u3066\uff08\u30d7\u30ec\u30fc\u30b9\u30db\u30eb\u30c0\u30fc\uff09",
            presetA:
              "\u30d7\u30ea\u30bb\u30c3\u30c8A\uff08\u30d7\u30ec\u30fc\u30b9\u30db\u30eb\u30c0\u30fc\uff09",
            presetB:
              "\u30d7\u30ea\u30bb\u30c3\u30c8B\uff08\u30d7\u30ec\u30fc\u30b9\u30db\u30eb\u30c0\u30fc\uff09",
          },
          match: {
            duration: "\u6642\u9593",
            startedAt: "\u958b\u59cb",
            csShort: "CS",
            damage: "\u30c0\u30e1\u30fc\u30b8",
            damageShare: "\u30c0\u30e1\u30fc\u30b8\u5272\u5408",
            spells: "\u30b5\u30e2\u30ca\u30fc\u30b9\u30da\u30eb",
            runes: "\u30eb\u30fc\u30f3",
            items: "\u30a2\u30a4\u30c6\u30e0",
            primaryRune: "\u30e1\u30a4\u30f3\u30eb\u30fc\u30f3",
            secondaryRuneStyle:
              "\u30b5\u30d6\u30eb\u30fc\u30f3\u30b9\u30bf\u30a4\u30eb",
            unknownSpell: "\u30b9\u30da\u30eb {{id}}",
            itemAlt: "\u30a2\u30a4\u30c6\u30e0 {{id}}",
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
