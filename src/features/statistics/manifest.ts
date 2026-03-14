import { BarChart3 } from "lucide-react";
import type { WebShard } from "@/jax/shard/web-shard.ts";
import { SHARD_IDS } from "../shard-ids";

export const statisticsShard: WebShard = {
  id: () => SHARD_IDS.STATISTICS,
  navItems: () => [
    {
      to: "/statistics",
      labelKey: "nav.statistics",
      icon: BarChart3,
      section: "main",
      order: 70,
    },
  ],
};
