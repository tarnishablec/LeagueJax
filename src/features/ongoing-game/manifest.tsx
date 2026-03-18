import { Gamepad2 } from "lucide-react";
import type { WebContribution } from "@/features/runtime/web-contract";
import { OngoingGame } from "@/routes/ongoing-game";
import { SHARD_IDS } from "../shard-ids";

export class OngoingGameShard implements WebContribution {
  public static readonly id = SHARD_IDS.ONGOING_GAME;
  public static readonly dependsOn = [SHARD_IDS.SETTINGS];

  public routes() {
    return [
      {
        path: "game",
        element: <OngoingGame />,
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
