/** @jsxImportSource solid-js */
import { ChartColumn } from "lucide-solid";
import { lazy } from "solid-js";
import { z } from "zod";
import type { Jax } from "@/jax";
import type { SolidWebShard } from "@/runtime/solid-web-contract";
import { lcuStore } from "@/stores/lcu.solid";
import { tabStore } from "@/stores/tabs.solid";
import { SolidSettingsShard } from "../settings/solid-settings-shard.solid";
import { SHARD_IDS } from "../shard-ids";
import { StaticCacheShard } from "../static-cache/manifest";
import { HistoryTabBar } from "./components/HistoryTabBar";
import { HistoryToolbar } from "./components/HistoryToolbar";
import {
  createHistoryFocusSyncController,
  type HistoryFocusSyncController,
} from "./hooks/use-focus-sync";
import { historyI18n } from "./i18n";
import {
  HISTORY_AUTO_OPEN_OWN_TAB_SETTING,
  HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING,
  HISTORY_MVP_ACE_STRATEGY_SETTING,
  HISTORY_SHOW_AUGMENT_DETAILS_SETTING,
} from "./settings-ids";
import { DEFAULT_MATCH_PERFORMANCE_STRATEGY } from "./utils/match-performance-badge";
import {
  deriveSgpServerIdFromClientArgs,
  deriveSgpServerIdFromRegion,
} from "./utils/server-display";

const HistoryRoute = lazy(() => import("./routes/HistoryRoute"));

export {
  HISTORY_AUTO_OPEN_OWN_TAB_SETTING,
  HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING,
  HISTORY_MVP_ACE_STRATEGY_SETTING,
  HISTORY_SHOW_AUGMENT_DETAILS_SETTING,
};

const HISTORY_BEHAVIOR_SECTION = "history.behavior" as const;
const HISTORY_DISPLAY_SECTION = "history.display" as const;

export class SolidHistoryShard implements SolidWebShard {
  private focusSyncController: HistoryFocusSyncController | null = null;

  public label() {
    return "SolidHistoryShard";
  }

  public id() {
    return SHARD_IDS.HISTORY;
  }

  public dependsOn() {
    return [SHARD_IDS.SETTINGS, SHARD_IDS.STATIC_CACHE];
  }

  public setup(jax: Jax): void {
    void tabStore.getState();
    void lcuStore.getState();

    const settingsShard = jax.getShard(SolidSettingsShard);
    void jax.getShard(StaticCacheShard);
    settingsShard.registerPage({ id: "history", order: 20 });
    settingsShard.registerSection({ key: HISTORY_BEHAVIOR_SECTION, order: 10 });
    settingsShard.registerSection({ key: HISTORY_DISPLAY_SECTION, order: 20 });

    settingsShard.registerSetting({
      id: HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING,
      labelKey: "settings.history.autoRefreshOnTabSwitch.label",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: false,
      order: 10,
      onSet: () => {},
    });

    settingsShard.registerSetting({
      id: HISTORY_AUTO_OPEN_OWN_TAB_SETTING,
      labelKey: "settings.history.autoOpenOwnTab.label",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: true,
      order: 11,
      onSet: () => {},
    });

    settingsShard.registerSetting({
      id: HISTORY_SHOW_AUGMENT_DETAILS_SETTING,
      labelKey: "settings.history.showAugmentDetails.label",
      hintKey: "settings.history.showAugmentDetails.hint",
      scope: "frontend",
      control: { kind: "toggle" },
      zod: z.boolean(),
      defaultValue: false,
      order: 20,
      onSet: () => {},
    });

    settingsShard.registerSetting({
      id: HISTORY_MVP_ACE_STRATEGY_SETTING,
      labelKey: "settings.history.mvpAceStrategy.label",
      hintKey: "settings.history.mvpAceStrategy.hint",
      scope: "frontend",
      control: { kind: "select" },
      options: [
        {
          value: "balanced",
          labelKey: "settings.history.mvpAceStrategy.options.balanced",
        },
        {
          value: "kda",
          labelKey: "settings.history.mvpAceStrategy.options.kda",
        },
      ],
      zod: z.enum(["kda", "balanced"]),
      defaultValue: DEFAULT_MATCH_PERFORMANCE_STRATEGY,
      order: 21,
      onSet: () => {},
    });

    this.focusSyncController = createHistoryFocusSyncController({
      closeAllTabs: () => tabStore.getState().closeAllTabs(),
      getAutoOpenOwnTab: () =>
        settingsShard.get<boolean>(HISTORY_AUTO_OPEN_OWN_TAB_SETTING) ?? false,
      getConnected: () =>
        lcuStore
          .getState()
          .instances.find(
            (instance) => instance.isFocused && instance.state === "ready",
          ),
      getFocusedServerId: () => {
        const connected = lcuStore
          .getState()
          .instances.find(
            (instance) => instance.isFocused && instance.state === "ready",
          );
        return (
          deriveSgpServerIdFromClientArgs(connected?.cmdArgs) ??
          deriveSgpServerIdFromRegion(connected?.region)
        );
      },
      hasExistingTabs: () => tabStore.getState().tabs.length > 0,
      openTab: (puuid, sgpServerId) =>
        tabStore.getState().openTab(puuid, sgpServerId),
      subscribeAutoOpenOwnTab: (listener) =>
        settingsShard.subscribe(HISTORY_AUTO_OPEN_OWN_TAB_SETTING, listener),
      subscribeFocusedClient: (listener) => lcuStore.subscribe(listener),
    });
    this.focusSyncController.start();
  }

  public teardown(): void {
    this.focusSyncController?.stop();
    this.focusSyncController = null;
  }

  public routes() {
    return [
      {
        path: "history",
        component: HistoryRoute,
        order: 10,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/main/history",
        labelKey: "nav.history",
        icon: ChartColumn,
        section: "main" as const,
        order: 10,
      },
    ];
  }

  public toolbarSlots() {
    return [
      {
        id: "history-search",
        node: <HistoryToolbar />,
        order: 10,
        routes: ["/main/history"],
      },
    ];
  }

  public titlebarSlots() {
    return [
      {
        id: "history-tabs",
        node: <HistoryTabBar />,
        order: 10,
        routes: ["/main/history"],
      },
    ];
  }

  public i18nResources() {
    return historyI18n;
  }
}
