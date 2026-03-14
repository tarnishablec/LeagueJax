import { MessageCircle } from "lucide-react";
import type { WebShard } from "@/core/shard/web-shard.ts";
import { SHARD_IDS } from "../shard-ids";

export const autoReplyShard: WebShard = {
  id: () => SHARD_IDS.AUTO_REPLY,
  navItems: () => [
    {
      to: "/auto-reply",
      labelKey: "nav.autoReply",
      icon: MessageCircle,
      section: "main",
      order: 40,
    },
  ],
};
