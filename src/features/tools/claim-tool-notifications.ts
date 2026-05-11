import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ClaimToolClaimablesAvailableEventDto } from "@/bindings/claim_tool";
import type { NotificationsShard } from "@/features/notifications/manifest";
import type { SettingId } from "@/features/settings/types";

export const CLAIM_TOOL_NOTIFICATION_SETTING_ID =
  "tools.claimTool.claimNotificationEnabled" as const satisfies SettingId;
export const CLAIM_TOOL_CLAIMABLES_AVAILABLE_EVENT =
  "claim-tool-claimables-available";

// ClaimTool owns the event semantics; NotificationsShard only receives a generic notification draft.
export async function setupClaimToolNotifications(
  notifications: NotificationsShard,
): Promise<UnlistenFn> {
  return listen<ClaimToolClaimablesAvailableEventDto>(
    CLAIM_TOOL_CLAIMABLES_AVAILABLE_EVENT,
    (event) => {
      if (event.payload.claimableCount === 0) {
        return;
      }

      notifications.publish({
        source: "claim-tool",
        level: "info",
        titleKey: "tools.claimTool.notifications.available.title",
        bodyKey: "tools.claimTool.notifications.available.body",
        values: {
          count: event.payload.claimableCount,
        },
        dedupeKey: `claim-tool:${event.payload.fingerprint}`,
        system: "respectUserSetting",
        systemSettingId: CLAIM_TOOL_NOTIFICATION_SETTING_ID,
        onClick: () => {
          window.location.hash = "#/main/tools";
        },
      });
    },
  );
}
