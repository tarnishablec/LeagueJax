import type { UnlistenFn } from "@tauri-apps/api/event";
import { Wrench } from "lucide-solid";
import { lazy } from "solid-js";
import { SolidNotificationsShard } from "@/features/notifications/manifest";
import type { Jax } from "@/jax";
import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { SHARD_IDS } from "../shard-ids";
import { setupClaimToolNotifications } from "./claim-tool-notifications";
import { toolsI18n } from "./i18n";

const ToolsRoute = lazy(() => import("./routes/ToolsRoute"));
const ToolsIndexRoute = lazy(() => import("./routes/ToolsIndexRoute"));
const ToolsClaimRoute = lazy(() => import("./routes/ToolsClaimRoute"));
const ToolsMcpRoute = lazy(() => import("./routes/ToolsMcpRoute"));

export class SolidToolsShard implements SolidWebShard {
  private claimToolNotificationsUnlisten: UnlistenFn | null = null;

  public label() {
    return "SolidToolsShard";
  }

  public id() {
    return SHARD_IDS.TOOLS;
  }

  public dependsOn() {
    return [
      SHARD_IDS.SETTINGS,
      SHARD_IDS.NOTIFICATIONS,
      SHARD_IDS.MCP,
    ] as const;
  }

  public async setup(jax: Jax): Promise<void> {
    const notifications = jax.getShard(SolidNotificationsShard);
    this.claimToolNotificationsUnlisten =
      await setupClaimToolNotifications(notifications);
  }

  public teardown(): void {
    if (this.claimToolNotificationsUnlisten) {
      this.claimToolNotificationsUnlisten();
      this.claimToolNotificationsUnlisten = null;
    }
  }

  public routes() {
    return [
      {
        path: "tools",
        component: ToolsRoute,
        children: [
          {
            component: ToolsIndexRoute,
          },
          {
            path: "claim",
            component: ToolsClaimRoute,
          },
          {
            path: "mcp",
            component: ToolsMcpRoute,
          },
        ],
        order: 86,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/main/tools",
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
