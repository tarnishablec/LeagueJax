import { Wrench } from "lucide-react";
import type { WebContribution } from "@/features/runtime/web-contract";
import { Tools } from "@/routes/tools";
import { SHARD_IDS } from "../shard-ids";

export class ToolsShard implements WebContribution {
  public static readonly id = SHARD_IDS.TOOLS;
  public static readonly dependsOn = [SHARD_IDS.SETTINGS];

  public routes() {
    return [
      {
        path: "tools",
        element: <Tools />,
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
    return {
      en: {
        nav: {
          tools: "Tools",
        },
      },
      "zh-CN": {
        nav: {
          tools: "\u5de5\u5177",
        },
      },
    };
  }
}
