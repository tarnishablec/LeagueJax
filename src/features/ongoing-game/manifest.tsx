import { Gamepad2 } from "lucide-react";
import type { WebShard } from "@/jax/shard/web-shard.ts";
import { OngoingGame } from "@/routes/ongoing-game";
import { SHARD_IDS } from "../shard-ids";

export const gameShard: WebShard = {
  id: () => SHARD_IDS.ONGOING_GAME,
  setupStores: () => {},
  routes: () => [
    {
      path: "game",
      element: <OngoingGame />,
      order: 20,
    },
  ],
  navItems: () => [
    {
      to: "/game",
      labelKey: "nav.game",
      icon: Gamepad2,
      section: "main",
      order: 20,
    },
  ],
  i18nResources: () => ({
    en: {
      nav: {
        game: "Game",
      },
    },
    "zh-CN": {
      nav: {
        game: "对局",
      },
    },
  }),
};
