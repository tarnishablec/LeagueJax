import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useEffectEvent } from "react";
import { useTranslation } from "react-i18next";
import type { UpdaterStateDto } from "@/bindings/updater";
import { createLogger } from "@/infra/logger";
import { showUpdateSettingsToast } from "../toasts";

const logger = createLogger("updater-toast-bridge");
const seenUpdateToastIds = new Set<string>();

const buildToastId = (state: UpdaterStateDto): string | null => {
  if (!state.latestVersion) {
    return null;
  }

  return `updater:${state.currentVersion}:${state.latestVersion}`;
};

export function UpdaterToastBridge() {
  const { t } = useTranslation();

  const notifyUpdateAvailable = useEffectEvent((state: UpdaterStateDto) => {
    if (state.kind !== "updateAvailable" || !state.latestVersion) {
      return;
    }

    const toastId = buildToastId(state);
    if (!toastId || seenUpdateToastIds.has(toastId)) {
      return;
    }

    seenUpdateToastIds.add(toastId);

    showUpdateSettingsToast({
      id: toastId,
      title: t("settings.update.status.updateAvailable"),
      duration: 10000,
    });
  });

  useEffect(() => {
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

    return () => {
      cancelled = true;
      if (unlisten) {
        void unlisten();
      }
    };
  }, []);

  return null;
}
