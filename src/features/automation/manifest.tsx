/** @jsxImportSource solid-js */
import { Bot } from "lucide-solid";
import { lazy } from "solid-js";
import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { SHARD_IDS } from "../shard-ids";
import { automationI18n } from "./i18n";

const AutomationRoute = lazy(() => import("./routes/AutomationRoute"));

export class SolidAutomationShard implements SolidWebShard {
  public label() {
    return "SolidAutomationShard";
  }

  public id() {
    return SHARD_IDS.AUTOMATION;
  }

  public routes() {
    return [
      {
        path: "automation",
        component: AutomationRoute,
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
