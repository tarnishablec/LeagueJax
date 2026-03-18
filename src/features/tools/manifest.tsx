import { Wrench } from "lucide-react";
import type { WebShard } from "@/jax/shard/web-shard";
import { Tools } from "@/routes/tools";
import { SHARD_IDS } from "../shard-ids";

export const toolsShard: WebShard = {
  id: () => SHARD_IDS.TOOLS,
  setupStores: () => {},
  routes: () => [
    {
      path: "tools",
      element: <Tools />,
      order: 86,
    },
  ],
  navItems: () => [
    {
      to: "/tools",
      labelKey: "nav.tools",
      icon: Wrench,
      section: "main",
      order: 90,
    },
  ],
  i18nResources: () => ({
    en: {
      nav: {
        tools: "Tools",
      },
    },
    "zh-CN": {
      nav: {
        tools: "工具",
      },
    },
  }),
};
