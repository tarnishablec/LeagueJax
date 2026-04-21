import { Wrench } from "lucide-react";
import { lazy, Suspense } from "react";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { toolsI18n } from "./i18n";

const ToolsRoute = lazy(() =>
  import("./routes/ToolsRoute").then((module) => ({
    default: module.ToolsRoute,
  })),
);

export class ToolsShard implements WebShard {
  public label() {
    return "ToolsShard";
  }

  public id() {
    return SHARD_IDS.TOOLS;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

  public routes() {
    return [
      {
        path: "tools",
        element: (
          <Suspense fallback={null}>
            <ToolsRoute />
          </Suspense>
        ),
        order: 86,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/tools",
        labelKey: "nav.tools",
        icon: Wrench,
        section: "main" as const,
        order: 90,
      },
    ];
  }

  public i18nResources() {
    return toolsI18n;
  }
}
