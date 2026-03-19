import { Gamepad2 } from "lucide-react";
import type { WebShard } from "@/features/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { OngoingGameRoute } from "./routes/OngoingGameRoute";

export class OngoingGameShard implements WebShard {
  public static readonly id = SHARD_IDS.ONGOING_GAME;
  public static readonly dependsOn = [SHARD_IDS.SETTINGS];

  public routes() {
    return [
      {
        path: "game",
        element: <OngoingGameRoute />,
        order: 20,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/game",
        labelKey: "nav.game",
        icon: Gamepad2,
        section: "main" as const,
        order: 20,
      },
    ];
  }

  public i18nResources() {
    return {
      en: {
        nav: {
          game: "Game",
        },
      },
      "zh-CN": {
        nav: {
          game: "\u5bf9\u5c40",
        },
      },
    };
  }
}
