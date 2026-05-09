import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { OngoingGameUpdated } from "@/bindings/ongoing_game";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { ongoingGameI18n } from "../ongoing-game/i18n";
import { useOngoingGameStore } from "../ongoing-game/store";
import { SHARD_IDS } from "../shard-ids";

export class MiniOngoingGameShard implements WebShard {
  private ongoingUpdatedUnlisten: UnlistenFn | null = null;
  private pendingUpdated: OngoingGameUpdated | null = null;
  private updateRafId: number | null = null;

  public label() {
    return "MiniOngoingGameShard";
  }

  public id() {
    return SHARD_IDS.ONGOING_GAME;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

  public async setup(_jax: Jax): Promise<void> {
    this.ongoingUpdatedUnlisten = await listen<OngoingGameUpdated>(
      "ongoing-game-updated",
      (event) => {
        this.pendingUpdated = event.payload;
        if (this.updateRafId != null) {
          return;
        }

        this.updateRafId = requestAnimationFrame(() => {
          this.updateRafId = null;
          const pending = this.pendingUpdated;
          if (pending) {
            this.pendingUpdated = null;
            useOngoingGameStore.getState().applyUpdated(pending);
          }
        });
      },
    );

    void invoke("ongoing_game_refresh");
  }

  public teardown(_jax: Jax): void {
    if (this.updateRafId != null) {
      cancelAnimationFrame(this.updateRafId);
      this.updateRafId = null;
      this.pendingUpdated = null;
    }
    if (this.ongoingUpdatedUnlisten) {
      this.ongoingUpdatedUnlisten();
      this.ongoingUpdatedUnlisten = null;
    }
    useOngoingGameStore.getState().reset();
  }

  public i18nResources() {
    return ongoingGameI18n;
  }
}
