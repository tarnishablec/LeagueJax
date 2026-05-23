import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { BackendNotificationRequestDto } from "@/bindings/notifications";
import type { NotificationDraft, NotificationValues } from "./types";

export const BACKEND_NOTIFICATION_REQUESTED_EVENT =
  "backend_notification_requested";

interface BackendNotificationPublisher {
  publish(draft: NotificationDraft): unknown;
}

function toNotificationValues(
  values: BackendNotificationRequestDto["values"],
): NotificationValues {
  const next: NotificationValues = {};

  for (const [key, value] of Object.entries(values ?? {})) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      next[key] = value;
    }
  }

  return next;
}

function toNotificationDraft(
  request: BackendNotificationRequestDto,
): NotificationDraft {
  return {
    source: request.source,
    level: request.level,
    titleKey: request.titleKey,
    bodyKey: request.bodyKey ?? undefined,
    values: toNotificationValues(request.values),
    dedupeKey: request.dedupeKey ?? undefined,
    system: request.system,
  };
}

export async function setupBackendNotificationBridge(
  notifications: BackendNotificationPublisher,
): Promise<UnlistenFn> {
  return listen<BackendNotificationRequestDto>(
    BACKEND_NOTIFICATION_REQUESTED_EVENT,
    (event) => {
      notifications.publish(toNotificationDraft(event.payload));
    },
  );
}
