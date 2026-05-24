import { Terminal } from "lucide-solid";
import { lazy } from "solid-js";
import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { SHARD_IDS } from "../shard-ids";
import { debugI18n } from "./i18n";

const DebugCommandRoute = lazy(() => import("./routes/DebugCommandRoute"));
const DEBUG_COMMAND_NAV_ORDER = Number.MAX_SAFE_INTEGER;

export class SolidDebugCommandShard implements SolidWebShard {
  public label() {
    return "SolidDebugCommandShard";
  }

  public id() {
    return SHARD_IDS.DEBUG_COMMANDS;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS] as const;
  }

  public routes() {
    if (!import.meta.env.DEV) {
      return [];
    }

    return [
      {
        path: "debug",
        component: DebugCommandRoute,
        order: DEBUG_COMMAND_NAV_ORDER,
      },
    ];
  }

  public navItems() {
    if (!import.meta.env.DEV) {
      return [];
    }

    return [
      {
        to: "/main/debug",
        labelKey: "nav.debugCommands",
        icon: Terminal,
        section: "main" as const,
        order: DEBUG_COMMAND_NAV_ORDER,
      },
    ];
  }

  public i18nResources() {
    return debugI18n;
  }
}
