import { Film } from "lucide-react";
import { lazy, Suspense } from "react";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { StaticCacheShard } from "../static-cache/manifest";
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

  public dependsOn() {
    return [SHARD_IDS.STATIC_CACHE];
  }

  public setup(jax: Jax): void {
    void jax.getShard(StaticCacheShard);
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
        order: 30,
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
        order: 30,
      },
    ];
  }

  public i18nResources() {
    return replayI18n;
  }
}
