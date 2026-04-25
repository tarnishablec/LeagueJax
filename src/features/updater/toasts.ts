import { appToaster } from "@/components/toastStore";

const SETTINGS_SYSTEM_HASH = "/main/settings/system";

interface UpdateSettingsToastOptions {
  closable?: boolean;
  duration?: number;
  hideIcon?: boolean;
  id?: string;
  title: string;
}

// export function navigateToUpdateSettings(): void {
//   window.location.hash = SETTINGS_SYSTEM_HASH;
// }

export function showUpdateSettingsToast(
  options: UpdateSettingsToastOptions,
): void {
  appToaster.warning({
    id: options.id,
    title: options.title,
    closable: options.closable,
    duration: options.duration ?? 10000,
    meta: {
      hideIcon: options.hideIcon,
      navigateTo: SETTINGS_SYSTEM_HASH,
    },
  });
}
