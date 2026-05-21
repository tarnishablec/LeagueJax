import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { onCleanup, onMount } from "solid-js";
import type { UpdaterStateDto } from "@/bindings/updater";
import { useSolidTranslation } from "@/i18n/solid";
import { createLogger } from "@/infra/logger";
import { showSolidUpdateSettingsToast } from "../toasts";

const logger = createLogger("solid-updater-toast-bridge");
const seenUpdateToastIds = new Set<string>();

const buildToastId = (state: UpdaterStateDto): string | null => {
  if (!state.latestVersion) {
    return null;
  }

  return `updater:${state.currentVersion}:${state.latestVersion}`;
};

export function UpdaterToastBridge(): null {
  const { t } = useSolidTranslation();

  const notifyUpdateAvailable = (state: UpdaterStateDto) => {
    if (state.kind !== "updateAvailable" || !state.latestVersion) {
      return;
    }

    const toastId = buildToastId(state);
    if (!toastId || seenUpdateToastIds.has(toastId)) {
      return;
    }

    seenUpdateToastIds.add(toastId);

    showSolidUpdateSettingsToast({
      id: toastId,
      title: t("settings.update.status.updateAvailable"),
      closable: false,
      duration: 10000,
      hideIcon: true,
    });
  };

  onMount(() => {
    let cancelled = false;
    let unlisten: UnlistenFn | null = null;

    const setup = async () => {
      try {
        const snapshot = await invoke<UpdaterStateDto>("get_updater_state");
        if (!cancelled) {
          notifyUpdateAvailable(snapshot);
        }

        unlisten = await listen<UpdaterStateDto>(
          "updater_state_changed",
          (event) => {
            notifyUpdateAvailable(event.payload);
          },
        );
      } catch (error) {
        logger.error({ error }, "Failed to initialize updater toast bridge");
      }
    };

    void setup();

    onCleanup(() => {
      cancelled = true;
      if (unlisten) {
        void unlisten();
      }
    });
  });

  return null;
}
