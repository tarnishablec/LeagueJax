import { Bot } from "lucide-react";
import { lazy, Suspense } from "react";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { automationI18n } from "./i18n";

const AutomationRoute = lazy(() =>
  import("./routes/AutomationRoute").then((module) => ({
    default: module.AutomationRoute,
  })),
);

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
        element: (
          <Suspense fallback={null}>
            <AutomationRoute />
          </Suspense>
        ),
        order: 85,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/main/automation",
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
