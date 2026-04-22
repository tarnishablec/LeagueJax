import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { trayI18n } from "./i18n";
import { TrayController } from "./tray";

const ENABLE_FRONTEND_TRAY = true;

export class TrayShard implements WebShard {
  private readonly controller = new TrayController();

  public label() {
    return "TrayShard";
  }

  public id() {
    return SHARD_IDS.TRAY;
  }

  public dependsOn() {
    return [SHARD_IDS.I18N] as const;
  }

  public async setup(_jax: Jax): Promise<void> {
    if (!ENABLE_FRONTEND_TRAY) {
      return;
    }

    await this.controller.initialize();
  }

  public async teardown(): Promise<void> {
    await this.controller.dispose();
  }

  public i18nResources() {
    return trayI18n;
  }
}
