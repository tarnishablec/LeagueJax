import { lazy, Suspense } from "react";
import type {
  RouteContribution,
  ToolbarSlot,
  WebShard,
} from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { MiniWindowToggleButton } from "./components/MiniWindowToggleButton";
import { miniI18n } from "./i18n";

const MiniRoute = lazy(() =>
  import("./routes/MiniRoute").then((module) => ({
    default: module.MiniRoute,
  })),
);

export class MiniShard implements WebShard {
  public label() {
    return "MiniShard";
  }

  public id() {
    return SHARD_IDS.MINI;
  }

  public dependsOn() {
    return [];
  }

  public routes(): RouteContribution[] {
    return [
      {
        index: true,
        layout: "mini",
        element: (
          <Suspense fallback={null}>
            <MiniRoute />
          </Suspense>
        ),
        order: 5,
      },
    ];
  }

  public toolbarSlots(): ToolbarSlot[] {
    return [
      {
        id: "mini-window-toggle",
        node: <MiniWindowToggleButton />,
        order: 95,
        routes: ["*"],
      },
    ];
  }

  public i18nResources() {
    return miniI18n;
  }
}
