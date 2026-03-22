import { Gamepad2 } from "lucide-react";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { ongoingGameI18n } from "./i18n";
import { OngoingGameRoute } from "./routes/OngoingGameRoute";

export class OngoingGameShard implements WebShard {
  public id() {
    return SHARD_IDS.ONGOING_GAME;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

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
    return ongoingGameI18n;
  }
}
