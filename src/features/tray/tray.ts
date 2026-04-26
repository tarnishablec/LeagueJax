import { invoke } from "@tauri-apps/api/core";
import { Image } from "@tauri-apps/api/image";
import { Menu, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { TrayIcon } from "@tauri-apps/api/tray";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { exit } from "@tauri-apps/plugin-process";
import i18n from "i18next";
import { createLogger } from "@/infra/logger";

const TRAY_ID = "main-tray";
const TRAY_ICON_RESOURCE = "icons/icon.ico";
const TRAY_TOOLTIP = "LeagueJax";
const TOGGLE_MINI_WINDOW_ID = "toggle-mini-window";
const QUIT_APP_ID = "quit-application";

const logger = createLogger("tray");

export class TrayController {
  private tray: TrayIcon | null = null;
  private menu: Menu | null = null;
  private initialized = false;
  private readonly handleLanguageChanged = (language: string) => {
    void this.refreshMenu(language);
  };

  public async initialize(): Promise<void> {
    if (this.initialized || getCurrentWebviewWindow().label !== "main") {
      return;
    }

    this.initialized = true;
    this.tray = (await TrayIcon.getById(TRAY_ID)) ?? (await this.createTray());

    await this.setTrayIcon();
    await this.tray.setTooltip(TRAY_TOOLTIP);
    await this.tray.setShowMenuOnLeftClick(false);
    await this.refreshMenu(i18n.resolvedLanguage ?? i18n.language);

    i18n.on("languageChanged", this.handleLanguageChanged);
  }

  public async dispose(): Promise<void> {
    i18n.off("languageChanged", this.handleLanguageChanged);

    const menu = this.menu;
    this.menu = null;
    this.tray = null;
    this.initialized = false;

    if (menu) {
      await menu.close();
    }
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
      logger.warn({error}, "Failed to resolve tray icon resource");
    }
  }

  private async refreshMenu(language: string): Promise<void> {
    if (!this.tray) {
      return;
    }

    const separator = await PredefinedMenuItem.new({item: "Separator"});
    const nextMenu = await Menu.new({
      items: [
        {
          id: TOGGLE_MINI_WINDOW_ID,
          text: i18n.t("tray.toggleMiniWindow", {
            lng: language,
            defaultValue: "Mini Window",
          }),
          action: () => {
            void invoke("toggle_mini_window");
          },
        },
        separator,
        {
          id: QUIT_APP_ID,
          text: i18n.t("tray.quit", {
            lng: language,
            defaultValue: "Quit",
          }),
          action: () => {
            void exit();
          },
        },
      ],
    });

    const previousMenu = this.menu;
    this.menu = nextMenu;

    await this.tray.setMenu(nextMenu);

    if (previousMenu) {
      await previousMenu.close();
    }
  }
}
