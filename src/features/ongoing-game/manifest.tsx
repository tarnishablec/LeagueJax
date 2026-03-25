import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Gamepad2 } from "lucide-react";
import { z } from "zod";
import type {
  OngoingGamePhaseChanged,
  OngoingGameSnapshotUpdated,
} from "@/bindings/ongoing_game";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SettingsShard } from "../settings/manifest";
import { SHARD_IDS } from "../shard-ids";
import { OngoingGameTitlebar } from "./components/OngoingGameTitlebar";
import { ongoingGameI18n } from "./i18n";
import { OngoingGameRoute } from "./routes/OngoingGameRoute";
import { useOngoingGameStore } from "./store";

const ONGOING_MATCH_HISTORY_COUNT_SETTING =
  "ongoing.behavior.matchHistoryCount";
const ONGOING_AUTO_SWITCH_TO_GAME_SETTING = "ongoing.behavior.autoSwitchToGame";
const ONGOING_SHOW_BOTS_SETTING = "ongoing.behavior.showBots";
const MATCH_HISTORY_COUNT_MIN = 1;
const MATCH_HISTORY_COUNT_MAX = 200;
const MATCH_HISTORY_COUNT_DEFAULT = 50;

function normalizeMatchHistoryCount(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return MATCH_HISTORY_COUNT_DEFAULT;
  }

  return Math.max(
    MATCH_HISTORY_COUNT_MIN,
    Math.min(MATCH_HISTORY_COUNT_MAX, Math.trunc(numeric)),
  );
}

function navigateTo(path: string): void {
  if (window.location.pathname === path) {
    return;
  }

  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

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

  public async setup(jax: Jax): Promise<void> {
    const settings = jax.getShard(SettingsShard);
    settings.registerSetting({
      id: ONGOING_MATCH_HISTORY_COUNT_SETTING,
      labelKey: "settings.ongoing.matchHistoryCount.label",
      scope: "frontend",
      control: {
        kind: "number",
        min: MATCH_HISTORY_COUNT_MIN,
        max: MATCH_HISTORY_COUNT_MAX,
        step: 1,
      },
      zod: z
        .number()
        .int()
        .min(MATCH_HISTORY_COUNT_MIN)
        .max(MATCH_HISTORY_COUNT_MAX),
      defaultValue: MATCH_HISTORY_COUNT_DEFAULT,
      order: 10,
      onSet: (next) => {
        const count = normalizeMatchHistoryCount(next);
        void invoke("ongoing_game_set_match_history_count", { count });
      },
    });
    settings.registerSetting({
      id: ONGOING_AUTO_SWITCH_TO_GAME_SETTING,
      labelKey: "settings.ongoing.autoSwitchToGame.label",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: false,
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

    const initialCount = normalizeMatchHistoryCount(
      settings.get<number>(ONGOING_MATCH_HISTORY_COUNT_SETTING),
    );
    await invoke("ongoing_game_set_match_history_count", {
      count: initialCount,
    });

    const store = useOngoingGameStore.getState();
    store.reset();

    this.phaseChangedUnlisten = await listen<OngoingGamePhaseChanged>(
      "ongoing-game-phase-changed",
      (event) => {
        const previousPhase = useOngoingGameStore.getState().phase;
        useOngoingGameStore.getState().applyPhaseChanged(event.payload);

        const autoSwitch = settings.get<boolean>(
          ONGOING_AUTO_SWITCH_TO_GAME_SETTING,
        );
        const enteredActiveGame =
          previousPhase === "Idle" && event.payload.phase !== "Idle";

        if (autoSwitch && enteredActiveGame) {
          navigateTo("/game");
        }
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
