import { Settings } from "lucide-react";
import { shardId } from "@/jax/shard/shard-id.ts";
import type { WebShard } from "@/jax/shard/web-shard.ts";

// Settings is a jax UI feature with no Rust shard counterpart
export const settingsShard: WebShard = {
  id: () => shardId("00000000-0000-4000-8000-000000000000"),
  navItems: () => [
    {
      to: "/settings",
      labelKey: "nav.settings",
      icon: Settings,
      section: "bottom",
      order: 0,
    },
  ],
};
