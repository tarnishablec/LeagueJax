import type { UnlistenFn } from "@tauri-apps/api/event";
import { Wrench } from "lucide-react";
import { lazy, Suspense } from "react";
import { NotificationsShard } from "@/features/notifications/manifest";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { setupClaimToolNotifications } from "./claim-tool-notifications";
import { toolsI18n } from "./i18n";

const ToolsRoute = lazy(() =>
  import("./routes/ToolsRoute").then((module) => ({
    default: module.ToolsRoute,
  })),
);

export class ToolsShard implements WebShard {
  private claimToolNotificationsUnlisten: UnlistenFn | null = null;

  public label() {
    return "ToolsShard";
  }

  public id() {
    return SHARD_IDS.TOOLS;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS, SHARD_IDS.NOTIFICATIONS] as const;
  }

  public async setup(jax: Jax): Promise<void> {
    const notifications = jax.getShard(NotificationsShard);
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
