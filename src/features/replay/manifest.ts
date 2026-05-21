import { Film } from "lucide-solid";
import { lazy } from "solid-js";
import type { Jax } from "@/jax";
import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { SHARD_IDS } from "../shard-ids";
import { StaticCacheShard } from "../static-cache/manifest";
import { replayI18n } from "./i18n";

const ReplayRoute = lazy(() => import("./routes/ReplayRoute"));

export class SolidReplayShard implements SolidWebShard {
  public label() {
    return "SolidReplayShard";
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
        component: ReplayRoute,
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
