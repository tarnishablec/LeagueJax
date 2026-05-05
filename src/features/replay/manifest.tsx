import { Film } from "lucide-react";
import { lazy, Suspense } from "react";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { replayI18n } from "./i18n";

const ReplayRoute = lazy(() =>
  import("./routes/ReplayRoute").then((module) => ({
    default: module.ReplayRoute,
  })),
);

export class ReplayShard implements WebShard {
  public label() {
    return "ReplayShard";
  }

  public id() {
    return SHARD_IDS.REPLAY;
  }

  public routes() {
    return [
      {
        path: "replay",
        element: (
          <Suspense fallback={null}>
            <ReplayRoute />
          </Suspense>
        ),
        order: 20,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/main/replay",
        labelKey: "nav.replay",
        icon: Film,
        section: "main" as const,
        order: 20,
      },
    ];
  }

  public i18nResources() {
    return replayI18n;
  }
}
