import { lazy, Suspense } from "react";
import type { ToolbarSlot, WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { MiniWindowToggleButton } from "./components/MiniWindowToggleButton";

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

  public routes() {
    return [
      {
        path: "mini",
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
}
