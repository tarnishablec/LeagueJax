import type { UpdaterStateDto } from "@/bindings/updater";
import type { NotificationDraft } from "@/features/notifications/types";

export const UPDATER_SETTINGS_HASH = "#/main/settings/system";
export const UPDATER_SETTINGS_SECTION_SELECTOR =
  '[data-settings-section-key="system.update"]';

// Hash navigation can render the settings page asynchronously, so retry briefly
// before giving up on section focus.
export function openUpdaterSettingsSection(attempts = 8): void {
  window.location.hash = UPDATER_SETTINGS_HASH;

  const scrollToSection = (remainingAttempts: number) => {
    const section = document.querySelector<HTMLElement>(
      UPDATER_SETTINGS_SECTION_SELECTOR,
    );
    if (section) {
      section.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }

    if (remainingAttempts <= 0) {
      return;
    }

    window.setTimeout(() => {
      scrollToSection(remainingAttempts - 1);
    }, 50);
  };

  scrollToSection(attempts);
}

export function buildUpdaterNotificationDraft(
  state: UpdaterStateDto,
): NotificationDraft | null {
  if (state.kind !== "updateAvailable" || !state.latestVersion) {
    return null;
  }

  return {
    source: "updater",
    level: "info",
    titleKey: "settings.update.notification.available.title",
    bodyKey: "settings.update.notification.available.body",
    values: {
      currentVersion: state.currentVersion,
      latestVersion: state.latestVersion,
    },
    dedupeKey: `updater:${state.currentVersion}:${state.latestVersion}`,
    system: "off",
    onClick: () => {
      openUpdaterSettingsSection();
    },
  };
}
