import { appToaster } from "@/components/toastStore";

const SETTINGS_SYSTEM_HASH = "/main/settings/system";

interface UpdateSettingsToastOptions {
  duration?: number;
  id?: string;
  title: string;
}

export function navigateToUpdateSettings(): void {
  window.location.hash = SETTINGS_SYSTEM_HASH;
}

export function showUpdateSettingsToast(
  options: UpdateSettingsToastOptions,
): void {
  appToaster.warning({
    id: options.id,
    title: options.title,
    duration: options.duration ?? 10000,
    meta: {
      navigateTo: SETTINGS_SYSTEM_HASH,
    },
  });
}
