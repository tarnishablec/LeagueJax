import { solidAppToaster } from "@/components/toastStore";

const SETTINGS_SYSTEM_HASH = "/main/settings/system";

interface UpdateSettingsToastOptions {
  closable?: boolean;
  duration?: number;
  hideIcon?: boolean;
  id?: string;
  title: string;
}

export function showSolidUpdateSettingsToast(
  options: UpdateSettingsToastOptions,
): void {
  solidAppToaster.warning({
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
