import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Settings } from "lucide-react";
import { lazy, Suspense } from "react";
import { mergeDeep } from "remeda";
import type {
  SettingsBootstrapDto,
  SettingsChangedEventDto,
  SettingsSnapshotDto,
} from "@/bindings/settings.ts";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createLogger } from "@/infra/logger";
import type { Jax } from "@/jax";
import type { WebShard } from "@/runtime/web-contract";
import { SHARD_IDS } from "../shard-ids";
import { settingsAboutI18n } from "./about.i18n";
import { settingsI18n } from "./i18n";
import { SettingsStore } from "./store";
import { registerGeneralSettings } from "./store/general";
import type {
  RegisteredSetting,
  SettingClassCtor,
  SettingDefinition,
  SettingId,
  SettingsSectionKey,
  SettingsSectionRenderer,
  SettingsShardApi,
} from "./types";

const SettingsRoute = lazy(() =>
  import("./routes/SettingsRoute").then((module) => ({
    default: module.SettingsRoute,
  })),
);

const SettingsIndexRoute = lazy(() =>
  import("./routes/SettingsIndexRoute").then((module) => ({
    default: module.SettingsIndexRoute,
  })),
);

const SettingsPageRoute = lazy(() =>
  import("./routes/SettingsPageRoute").then((module) => ({
    default: module.SettingsPageRoute,
  })),
);

export class SettingsShard implements WebShard, SettingsShardApi {
  private readonly sourceId = `web-${crypto.randomUUID()}`;
  private changedUnlisten: UnlistenFn | null = null;
  private patchQueue = Promise.resolve();
  private readonly logger = createLogger("settings-shard");
  private readonly store = new SettingsStore();

  public label() {
    return "SettingsShard";
  }

  public id() {
    return SHARD_IDS.SETTINGS;
  }

  public async setup(_jax: Jax): Promise<void> {
    registerGeneralSettings(this);

    this.store.configureRemotePatchSender((changes) => {
      this.patchQueue = this.patchQueue
        .then(() => this.pushPatch(changes))
        .catch((error: unknown) => {
          this.logger.error({ error }, "Failed to sync settings changes");
        });
    });

    await this.refreshFromBackend({ notify: false, runOnSet: false });

    this.changedUnlisten = await listen<SettingsChangedEventDto>(
      "settings_changed",
      (event) => {
        if (event.payload.source === this.sourceId) {
          return;
        }

        this.store.applyRemotePatch(event.payload.changes);
      },
    );
  }

  public teardown(): void {
    if (this.changedUnlisten) {
      this.changedUnlisten();
      this.changedUnlisten = null;
    }
    this.store.configureRemotePatchSender(null);
  }

  public registerSetting(definition: SettingDefinition): void {
    this.store.registerSetting(definition);
  }

  public registerClass(ctor: SettingClassCtor): void {
    this.store.registerClass(ctor);
  }

  public get<T = unknown>(id: SettingId): T {
    return this.store.get<T>(id);
  }

  public set<T = unknown>(id: SettingId, value: T): boolean {
    return this.store.set(id, value);
  }

  public reset(ids?: SettingId[]): boolean {
    return this.store.reset(ids);
  }

  public subscribe(id: SettingId, callback: () => void): () => void {
    return this.store.subscribe(id, callback);
  }

  public listDefinitions(): RegisteredSetting[] {
    return this.store.listDefinitions();
  }

  public registerSectionRenderer(
    key: SettingsSectionKey,
    renderer: SettingsSectionRenderer,
  ): void {
    this.store.registerSectionRenderer(key, renderer);
  }

  public getSectionRenderer(
    key: SettingsSectionKey,
  ): SettingsSectionRenderer | undefined {
    return this.store.getSectionRenderer(key);
  }

  public routes() {
    return [
      {
        path: "settings",
        element: (
          <Suspense fallback={null}>
            <SettingsRoute />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={null}>
                <SettingsIndexRoute />
              </Suspense>
            ),
          },
          {
            path: ":pageId",
            element: (
              <Suspense fallback={null}>
                <SettingsPageRoute />
              </Suspense>
            ),
          },
        ],
        order: 90,
      },
    ];
  }

  public navItems() {
    return [
      {
        to: "/settings",
        labelKey: "nav.settings",
        icon: Settings,
        section: "bottom" as const,
        order: 10,
      },
    ];
  }

  public toolbarSlots() {
    return [
      {
        id: "settings-language-toggle",
        node: <LanguageToggle />,
        order: 99,
      },
      {
        id: "settings-theme-toggle",
        node: <ThemeToggle />,
        order: 100,
      },
    ];
  }

  public i18nResources() {
    return mergeDeep(settingsI18n, settingsAboutI18n);
  }

  private async refreshFromBackend(options: {
    notify: boolean;
    runOnSet: boolean;
  }): Promise<void> {
    const bootstrap = await invoke<SettingsBootstrapDto>(
      "get_settings_bootstrap",
    );
    this.store.mergeRemoteDefinitions(bootstrap.definitions);
    this.store.hydrateFromSnapshot(bootstrap.snapshot, options);
  }

  private async pushPatch(changes: Record<string, unknown>): Promise<void> {
    try {
      await invoke<SettingsSnapshotDto>("set_settings_values", {
        changes,
        source: this.sourceId,
      });
    } catch (error) {
      this.logger.warn(
        { error },
        "Settings sync failed, refreshing from backend snapshot",
      );
      await this.refreshFromBackend({ notify: true, runOnSet: true });
    }
  }
}
