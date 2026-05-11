import { Popover } from "@ark-ui/react/popover";
import { Portal } from "@ark-ui/react/portal";
import { Bell, Trash2 } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { trigger as toolbarTrigger } from "@/components/ToolbarActionButton.css";
import { createLogger } from "@/infra/logger";
import * as s from "./NotificationCenterButton.css";
import type { NotificationsStore } from "./store";
import type { AppNotification } from "./types";

const logger = createLogger("notification-center");

function formatNotificationTime(timestamp: number, language: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString(language, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationRow({
  notification,
  store,
}: {
  notification: AppNotification;
  store: NotificationsStore;
}) {
  const { i18n, t } = useTranslation();
  const unread = notification.readAt == null;
  const body =
    notification.bodyKey == null
      ? null
      : t(notification.bodyKey, notification.values);
  const markRead = () => {
    if (unread) {
      store.markRead(notification.id);
    }
  };
  const activate = async () => {
    const activated = await store.activate(notification.id);
    if (!activated) {
      logger.warn(
        { notificationId: notification.id, source: notification.source },
        "Notification activation failed",
      );
    }
  };

  return (
    <li className={s.itemShell}>
      <button
        type="button"
        className={s.item}
        data-unread={unread ? "true" : undefined}
        onClick={() => {
          void activate();
        }}
        onFocus={markRead}
        onMouseEnter={markRead}
      >
        <span className={s.unreadDot} aria-hidden="true" />
        <span className={s.itemMain}>
          <span className={s.itemHeader}>
            <span className={s.itemTitle}>
              {t(notification.titleKey, notification.values)}
            </span>
            <span className={s.itemTime}>
              {formatNotificationTime(notification.createdAt, i18n.language)}
            </span>
          </span>
          {body ? <span className={s.itemBody}>{body}</span> : null}
        </span>
      </button>
    </li>
  );
}

export function NotificationCenterButton({
  store,
}: {
  store: NotificationsStore;
}) {
  const { t } = useTranslation();
  useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.version(),
    () => store.version(),
  );
  const notifications = store.list();
  const unreadCount = store.unreadCount();
  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) {
      return t("notifications.center.open");
    }
    return t("notifications.center.openWithUnread", {
      count: unreadCount,
    });
  }, [t, unreadCount]);

  return (
    <Popover.Root
      lazyMount
      unmountOnExit
      positioning={{ placement: "bottom-end", gutter: 6 }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={unreadLabel}
          className={`${toolbarTrigger} ${s.trigger}`}
        >
          <Bell size={14} aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className={s.badge} aria-hidden="true">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner className={s.positioner}>
          <Popover.Content className={s.content}>
            <div className={s.header}>
              <Popover.Title className={s.title}>
                {t("notifications.center.title")}
              </Popover.Title>
              <button
                type="button"
                className={s.clearButton}
                disabled={notifications.length === 0}
                aria-label="Clear notifications"
                onClick={() => store.clear()}
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>{t("notifications.center.clear")}</span>
              </button>
            </div>

            <ul className={s.list}>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    store={store}
                  />
                ))
              ) : (
                <li className={s.empty}>{t("notifications.center.empty")}</li>
              )}
            </ul>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
