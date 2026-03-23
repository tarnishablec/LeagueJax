import { Bot } from "lucide-react";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { automationI18n } from "./i18n";
import { AutomationRoute } from "./routes/AutomationRoute";

export class AutomationShard implements WebShard {
  public label() {
    return "AutomationShard";
  }

  public id() {
    return SHARD_IDS.AUTOMATION;
  }

  public routes() {
    return [
      {
        path: "automation",
        element: <AutomationRoute />,
        order: 85,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/automation",
        labelKey: "nav.automation",
        icon: Bot,
        section: "main" as const,
        order: 80,
      },
    ];
  }

  public i18nResources() {
    return automationI18n;
  }
}
