import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Gamepad2 } from "lucide-react";
import type {
  OngoingGamePhaseChanged,
  OngoingGameSnapshotUpdated,
} from "@/bindings/ongoing_game";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { OngoingGameTitlebar } from "./components/OngoingGameTitlebar";
import { ongoingGameI18n } from "./i18n";
import { OngoingGameRoute } from "./routes/OngoingGameRoute";
import { useOngoingGameStore } from "./store";

export class OngoingGameShard implements WebShard {
  private phaseChangedUnlisten: UnlistenFn | null = null;
  private snapshotUpdatedUnlisten: UnlistenFn | null = null;

  public label() {
    return "OngoingGameShard";
  }

  public id() {
    return SHARD_IDS.ONGOING_GAME;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS];
  }

  public async setup(_jax: Jax): Promise<void> {
    const store = useOngoingGameStore.getState();
    store.reset();

    this.phaseChangedUnlisten = await listen<OngoingGamePhaseChanged>(
      "ongoing-game-phase-changed",
      (event) => {
        useOngoingGameStore.getState().applyPhaseChanged(event.payload);
      },
    );

    this.snapshotUpdatedUnlisten = await listen<OngoingGameSnapshotUpdated>(
      "ongoing-game-snapshot-updated",
      (event) => {
        useOngoingGameStore.getState().applySnapshotUpdated(event.payload);
      },
    );
  }

  public teardown(_jax: Jax): void {
    if (this.phaseChangedUnlisten) {
      this.phaseChangedUnlisten();
      this.phaseChangedUnlisten = null;
    }

    if (this.snapshotUpdatedUnlisten) {
      this.snapshotUpdatedUnlisten();
      this.snapshotUpdatedUnlisten = null;
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
