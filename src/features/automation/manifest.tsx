import { Bot } from "lucide-react";
import type { WebShard } from "@/jax/shard/web-shard";
import { Automation } from "@/routes/automation";
import { SHARD_IDS } from "../shard-ids";

export const automationShard: WebShard = {
  id: () => SHARD_IDS.AUTOMATION,
  setupStores: () => {},
  routes: () => [
    {
      path: "automation",
      element: <Automation />,
      order: 85,
    },
  ],
  navItems: () => [
    {
      to: "/automation",
      labelKey: "nav.automation",
      icon: Bot,
      section: "main",
      order: 80,
    },
  ],
  i18nResources: () => ({
    en: {
      nav: {
        automation: "Automation",
      },
    },
    "zh-CN": {
      nav: {
        automation: "自动化",
      },
    },
  }),
};
