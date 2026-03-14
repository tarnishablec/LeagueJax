import { Workflow } from "lucide-react";
import type { WebShard } from "@/core/shard/web-shard.ts";
import { SHARD_IDS } from "../shard-ids";

export const autoGameflowShard: WebShard = {
  id: () => SHARD_IDS.AUTO_GAMEFLOW,
  navItems: () => [
    {
      to: "/auto-gameflow",
      labelKey: "nav.autoGameflow",
      icon: Workflow,
      section: "main",
      order: 30,
    },
  ],
};
