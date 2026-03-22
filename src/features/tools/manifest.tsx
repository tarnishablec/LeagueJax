import { Wrench } from "lucide-react";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { toolsI18n } from "./i18n";
import { ToolsRoute } from "./routes/ToolsRoute";

export class ToolsShard implements WebShard {
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
        element: <ToolsRoute />,
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
