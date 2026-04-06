import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Gamepad2 } from "lucide-react";
import { z } from "zod";
import type {
  OngoingGameMatchHistoriesUpdated,
  OngoingGameSummonersUpdated,
  OngoingGameUpdated,
} from "@/bindings/ongoing_game";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SettingsShard } from "../settings/manifest";
import { SHARD_IDS } from "../shard-ids";
import { OngoingGameTitlebar } from "./components/OngoingGameTitlebar";
import { ongoingGameI18n } from "./i18n";
import { OngoingGameRoute } from "./routes/OngoingGameRoute";
import { useOngoingGameStore } from "./store";

const ONGOING_AUTO_SWITCH_TO_GAME_SETTING = "ongoing.behavior.autoSwitchToGame";
const ONGOING_SHOW_BOTS_SETTING = "ongoing.behavior.showBots";

function navigateTo(path: string): void {
  if (window.location.pathname === path) {
    return;
  }

  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Collects items within a single animation frame, then flushes them in one batch. */
function createRafBatcher<T>(flush: (batch: T[]) => void) {
  let pending: T[] = [];
  let rafId: number | null = null;

  return {
    push(item: T) {
      pending.push(item);
      if (rafId == null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (pending.length > 0) {
            const batch = pending;
            pending = [];
            flush(batch);
          }
        });
      }
    },
    cancel() {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pending = [];
    },
  };
}

export class OngoingGameShard implements WebShard {
  private ongoingUpdatedUnlisten: UnlistenFn | null = null;
  private ongoingSummonersUpdatedUnlisten: UnlistenFn | null = null;
  private ongoingMatchHistoriesUpdatedUnlisten: UnlistenFn | null = null;
  private pendingUpdated: OngoingGameUpdated | null = null;
  private updateRafId: number | null = null;
  private summonerBatcher = createRafBatcher<OngoingGameSummonersUpdated>(
    (batch) => useOngoingGameStore.getState().batchSummonersUpdated(batch),
  );
  private historyBatcher = createRafBatcher<OngoingGameMatchHistoriesUpdated>(
    (batch) => useOngoingGameStore.getState().batchMatchHistoriesUpdated(batch),
  );

  public label() {
    return "OngoingGameShard";
  }

  public id() {
    return SHARD_IDS.ONGOING_GAME;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

  public async setup(jax: Jax): Promise<void> {
    const settings = jax.getShard(SettingsShard);
    settings.registerSetting({
      id: ONGOING_AUTO_SWITCH_TO_GAME_SETTING,
      labelKey: "settings.ongoing.autoSwitchToGame.label",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: true,
      order: 20,
      onSet: () => {},
    });
    settings.registerSetting({
      id: ONGOING_SHOW_BOTS_SETTING,
      labelKey: "settings.ongoing.showBots.label",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: true,
      order: 30,
      onSet: () => {},
    });

    this.ongoingUpdatedUnlisten = await listen<OngoingGameUpdated>(
      "ongoing-game-updated",
      (event) => {
        // Check auto-switch eagerly before coalescing so it fires immediately.
        const autoSwitch = settings.get<boolean>(
          ONGOING_AUTO_SWITCH_TO_GAME_SETTING,
        );
        if (autoSwitch) {
          const currentPhase = useOngoingGameStore.getState().phase;
          if (currentPhase === "Idle" && event.payload.phase !== "Idle") {
            navigateTo("/game");
          }
        }

        // Coalesce rapid Updated events — only the latest snapshot matters.
        this.pendingUpdated = event.payload;
        if (this.updateRafId == null) {
          this.updateRafId = requestAnimationFrame(() => {
            this.updateRafId = null;
            const pending = this.pendingUpdated;
            if (pending) {
              this.pendingUpdated = null;
              useOngoingGameStore.getState().applyUpdated(pending);
            }
          });
        }
      },
    );
    this.ongoingSummonersUpdatedUnlisten =
      await listen<OngoingGameSummonersUpdated>(
        "ongoing-game-summoners-updated",
        (event) => this.summonerBatcher.push(event.payload),
      );
    this.ongoingMatchHistoriesUpdatedUnlisten =
      await listen<OngoingGameMatchHistoriesUpdated>(
        "ongoing-game-match-histories-updated",
        (event) => this.historyBatcher.push(event.payload),
      );

    void invoke("ongoing_game_refresh");
  }

  public teardown(_jax: Jax): void {
    if (this.updateRafId != null) {
      cancelAnimationFrame(this.updateRafId);
      this.updateRafId = null;
      this.pendingUpdated = null;
    }
    this.summonerBatcher.cancel();
    this.historyBatcher.cancel();
    if (this.ongoingUpdatedUnlisten) {
      this.ongoingUpdatedUnlisten();
      this.ongoingUpdatedUnlisten = null;
    }
    if (this.ongoingSummonersUpdatedUnlisten) {
      this.ongoingSummonersUpdatedUnlisten();
      this.ongoingSummonersUpdatedUnlisten = null;
    }
    if (this.ongoingMatchHistoriesUpdatedUnlisten) {
      this.ongoingMatchHistoriesUpdatedUnlisten();
      this.ongoingMatchHistoriesUpdatedUnlisten = null;
    }
    useOngoingGameStore.getState().reset();
  }

  public routes() {
    return [
      {
        path: "game",
        element: <OngoingGameRoute />,
        order: 20,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/game",
        labelKey: "nav.game",
        icon: Gamepad2,
        section: "main" as const,
        order: 20,
      },
    ];
  }

  public titlebarSlots() {
    return [
      {
        id: "ongoing-game-titlebar",
        node: <OngoingGameTitlebar />,
        order: 20,
        routes: ["/game"],
      },
    ];
  }

  public i18nResources() {
    return ongoingGameI18n;
  }
}
