import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { UpdaterStateDto } from "@/bindings/updater";
import type { NotificationDraft } from "@/features/notifications/types";
import { createLogger } from "@/infra/logger";
import { buildUpdaterNotificationDraft } from "./notification-draft";

const logger = createLogger("solid-updater-notifications");

interface UpdaterNotificationPublisher {
  publish(draft: NotificationDraft): unknown;
}

export async function setupUpdaterNotifications(
  notifications: UpdaterNotificationPublisher,
): Promise<UnlistenFn> {
  const publishState = (state: UpdaterStateDto) => {
    const draft = buildUpdaterNotificationDraft(state);
    if (draft) {
      notifications.publish(draft);
    }
  };

  let unlisten: UnlistenFn = () => {};

  try {
    unlisten = await listen<UpdaterStateDto>(
      "updater_state_changed",
      (event) => {
        publishState(event.payload);
      },
    );
  } catch (error) {
    logger.warn({ error }, "Failed to listen for updater state changes");
  }

  try {
    const snapshot = await invoke<UpdaterStateDto>("get_updater_state");
    publishState(snapshot);
  } catch (error) {
    logger.warn({ error }, "Failed to load updater state for notifications");
  }

  return unlisten;
}
