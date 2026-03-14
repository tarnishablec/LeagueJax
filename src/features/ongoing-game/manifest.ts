import { Gamepad2 } from "lucide-react";
import type { WebShard } from "@/jax/shard/web-shard.ts";
import { SHARD_IDS } from "../shard-ids";

export const ongoingGameShard: WebShard = {
  id: () => SHARD_IDS.ONGOING_GAME,
  navItems: () => [
    {
      to: "/ongoing-game",
      labelKey: "nav.ongoingGame",
      icon: Gamepad2,
      section: "main",
      order: 50,
    },
  ],
};
