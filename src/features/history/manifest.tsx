import { BarChart3 } from "lucide-react";
import type { WebShard } from "@/jax/shard/web-shard.ts";
import { TabBar } from "@/components/TabBar.tsx";
import { History } from "@/routes/history.tsx";
import { useLcuStore } from "@/stores/lcu";
import { useTabStore } from "@/stores/tabs";
import { SHARD_IDS } from "../shard-ids";
import { HistoryToolbar } from "./components/HistoryToolbar";

export const historyShard: WebShard = {
  id: () => SHARD_IDS.HISTORY,
  setupStores: () => {
    void useTabStore.getState();
    void useLcuStore.getState();
  },
  routes: () => [
    {
      path: "history",
      element: <History />,
      order: 10,
    },
  ],
  navItems: () => [
    {
      to: "/history",
      labelKey: "nav.history",
      icon: BarChart3,
      section: "main",
      order: 10,
    },
  ],
  toolbarSlots: () => [
    {
      id: "history-search",
      node: <HistoryToolbar />,
      order: 10,
      routes: ["/history"],
    },
  ],
  titlebarSlots: () => [
    {
      id: "history-tabs",
      node: <TabBar />,
      order: 10,
      routes: ["/history"],
    },
  ],
  i18nResources: () => ({
    en: {
      nav: {
        history: "History",
      },
    },
    "zh-CN": {
      nav: {
        history: "战绩",
      },
    },
  }),
};
