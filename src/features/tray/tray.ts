import { invoke } from "@tauri-apps/api/core";
import { Image } from "@tauri-apps/api/image";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { TrayIcon } from "@tauri-apps/api/tray";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { exit } from "@tauri-apps/plugin-process";
import { createEffect, createRoot } from "solid-js";
import { getSolidI18n } from "@/i18n/solid";
import { createLogger } from "@/infra/logger";

const TRAY_ID = "main-tray";
const TRAY_ICON_RESOURCE = "icons/icon.ico";
const TRAY_TOOLTIP = "LeagueJax";
const TOGGLE_MINI_WINDOW_ID = "toggle-mini-window";
const QUIT_APP_ID = "quit-application";

const logger = createLogger("tray");

type ClosableMenuResource = Menu | MenuItem | PredefinedMenuItem;

export class TrayController {
  private tray: TrayIcon | null = null;
  private menuResources: ClosableMenuResource[] = [];
  private initialized = false;
  private disposeLanguageWatcher: (() => void) | null = null;

  public async initialize(): Promise<void> {
    if (this.initialized || getCurrentWebviewWindow().label !== "main") {
      return;
    }

    this.initialized = true;
    this.tray = (await TrayIcon.getById(TRAY_ID)) ?? (await this.createTray());

    await this.setTrayIcon();
    await this.tray.setTooltip(TRAY_TOOLTIP);
    await this.tray.setShowMenuOnLeftClick(false);
    await this.refreshMenu();

    this.disposeLanguageWatcher = this.watchLanguageChanges();
  }

  public async dispose(): Promise<void> {
    this.disposeLanguageWatcher?.();
    this.disposeLanguageWatcher = null;

    const resources = this.menuResources;
    this.menuResources = [];
    this.tray = null;
    this.initialized = false;

    await closeMenuResources(resources);
  }

  private async createTray(): Promise<TrayIcon> {
    return TrayIcon.new({
      id: TRAY_ID,
      tooltip: TRAY_TOOLTIP,
      showMenuOnLeftClick: false,
    });
  }

  private async setTrayIcon(): Promise<void> {
    if (!this.tray) {
      return;
    }

    try {
      const iconPath = await resolveResource(TRAY_ICON_RESOURCE);
      const icon = await Image.fromPath(iconPath);
      await this.tray.setIcon(icon);
    } catch (error) {
      logger.warn({ error }, "Failed to resolve tray icon resource");
    }
  }

  // Tray lives outside the Solid component tree, so it owns a small root to
  // react to language changes without tying native resources to UI rendering.
  private watchLanguageChanges(): () => void {
    const solidI18n = getSolidI18n();
    let previousLanguage = solidI18n.language();

    return createRoot((dispose) => {
      createEffect(() => {
        const nextLanguage = solidI18n.language();

        if (nextLanguage === previousLanguage) {
          return;
        }

        previousLanguage = nextLanguage;
        void this.refreshMenu();
      });

      return dispose;
    });
  }

  private async refreshMenu(): Promise<void> {
    if (!this.tray) {
      return;
    }

    const nextResources: ClosableMenuResource[] = [];

    try {
      const toggleMiniWindowItem = await MenuItem.new({
        id: TOGGLE_MINI_WINDOW_ID,
        text: translateTrayText("tray.toggleMiniWindow", "Mini Window"),
        action: () => {
          void invoke("toggle_mini_window");
        },
      });
      nextResources.push(toggleMiniWindowItem);

      const separator = await PredefinedMenuItem.new({ item: "Separator" });
      nextResources.push(separator);

      const quitItem = await MenuItem.new({
        id: QUIT_APP_ID,
        text: translateTrayText("tray.quit", "Quit"),
        action: () => {
          void exit();
        },
      });
      nextResources.push(quitItem);

      const nextMenu = await Menu.new();
      nextResources.push(nextMenu);

      await nextMenu.append([toggleMiniWindowItem, separator, quitItem]);

      const previousResources = this.menuResources;
      this.menuResources = nextResources;

      await this.tray.setMenu(nextMenu);
      await closeMenuResources(previousResources);
    } catch (error) {
      await closeMenuResources(nextResources);
      throw error;
    }
  }
}

function translateTrayText(key: string, fallback: string): string {
  const text = getSolidI18n().t(key);
  return text === key ? fallback : text;
}

// Menu refresh creates native resources on the Rust side; cleanup is best-effort
// because a failed close should not prevent shard teardown or a later refresh.
async function closeMenuResources(
  resources: ClosableMenuResource[],
): Promise<void> {
  const results = await Promise.allSettled(
    [...resources].reverse().map((resource) => resource.close()),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      logger.warn(
        { error: result.reason },
        "Failed to close tray menu resource",
      );
    }
  }
}
