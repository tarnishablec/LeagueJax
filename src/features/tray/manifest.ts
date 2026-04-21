import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { trayI18n } from "./i18n";
import { TrayController } from "./tray";

export class TrayShard implements WebShard {
  private readonly controller = new TrayController();

  public label() {
    return "TrayShard";
  }

  public id() {
    return SHARD_IDS.TRAY;
  }

  public async setup(_jax: Jax): Promise<void> {}

  public async teardown(): Promise<void> {
    await this.controller.dispose();
  }

  public async initialize(): Promise<void> {
    await this.controller.initialize();
  }

  public i18nResources() {
    return trayI18n;
  }
}
