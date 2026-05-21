/** @jsxImportSource solid-js */
import { Popover } from "@ark-ui/solid/popover";
import { keyArray } from "@solid-primitives/keyed";
import { Bell, Trash2 } from "lucide-solid";
import type { JSX } from "solid-js";
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { trigger as toolbarTrigger } from "@/components/ToolbarActionButton.css.ts";
import { useSolidTranslation } from "@/i18n/solid";
import { createLogger } from "@/infra/logger";
import * as s from "./NotificationCenterButton.css.ts";
import type { NotificationsStore } from "./store";
import type { AppNotification } from "./types";

const logger = createLogger("solid-notification-center");

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

function NotificationRow(props: {
  notification: AppNotification;
  store: NotificationsStore;
}): JSX.Element {
  const { language, t } = useSolidTranslation();
  const unread = () => props.notification.readAt == null;
  const body = createMemo(() =>
    props.notification.bodyKey == null
      ? null
      : t(props.notification.bodyKey, props.notification.values),
  );
  const markRead = () => {
    if (unread()) {
      props.store.markRead(props.notification.id);
    }
  };
  const activate = async () => {
    const activated = await props.store.activate(props.notification.id);
    if (!activated) {
      logger.warn(
        {
          notificationId: props.notification.id,
          source: props.notification.source,
        },
        "Notification activation failed",
      );
    }
  };

  return (
    <li class={s.itemShell}>
      <button
        type="button"
        class={s.item}
        data-unread={unread() ? "true" : undefined}
        onClick={() => {
          void activate();
        }}
        onFocus={markRead}
        onMouseEnter={markRead}
      >
        <span class={s.unreadDot} aria-hidden="true" />
        <span class={s.itemMain}>
          <span class={s.itemHeader}>
            <span class={s.itemTitle}>
              {t(props.notification.titleKey, props.notification.values)}
            </span>
            <span class={s.itemTime}>
              {formatNotificationTime(props.notification.createdAt, language())}
            </span>
          </span>
          <Show when={body()}>
            {(text) => <span class={s.itemBody}>{text()}</span>}
          </Show>
        </span>
      </button>
    </li>
  );
}

export function NotificationCenterButton(props: {
  store: NotificationsStore;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const [version, setVersion] = createSignal(props.store.version());

  onMount(() => {
    const unsubscribe = props.store.subscribe(() => {
      setVersion(props.store.version());
    });
    onCleanup(unsubscribe);
  });

  const notifications = createMemo(() => {
    version();
    return props.store.list();
  });
  const unreadCount = createMemo(() => {
    version();
    return props.store.unreadCount();
  });
  const unreadLabel = createMemo(() => {
    if (unreadCount() <= 0) {
      return t("notifications.center.open");
    }
    return t("notifications.center.openWithUnread", {
      count: unreadCount(),
    });
  });
  const notificationRows = keyArray(
    notifications,
    (notification) => notification.id,
    (notification) => (
      <NotificationRow notification={notification()} store={props.store} />
    ),
  );

  return (
    <Popover.Root
      lazyMount
      unmountOnExit
      positioning={{ placement: "bottom-end", gutter: 6 }}
    >
      <Popover.Trigger
        asChild={(getTriggerProps) => (
          <button
            {...getTriggerProps({
              type: "button",
              "aria-label": unreadLabel(),
              class: `${toolbarTrigger} ${s.trigger}`,
            })}
          >
            <Bell size={14} aria-hidden="true" />
            <Show when={unreadCount() > 0}>
              <span class={s.badge} aria-hidden="true">
                {unreadCount() > 9 ? "9+" : unreadCount()}
              </span>
            </Show>
          </button>
        )}
      />

      <Portal>
        <Popover.Positioner class={s.positioner}>
          <Popover.Content class={s.content}>
            <div class={s.header}>
              <Popover.Title class={s.title}>
                {t("notifications.center.title")}
              </Popover.Title>
              <button
                type="button"
                class={s.clearButton}
                disabled={notifications().length === 0}
                aria-label="Clear notifications"
                onClick={() => props.store.clear()}
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>{t("notifications.center.clear")}</span>
              </button>
            </div>

            <ul class={s.list}>
              <Show
                when={notifications().length > 0}
                fallback={
                  <li class={s.empty}>{t("notifications.center.empty")}</li>
                }
              >
                {notificationRows()}
              </Show>
            </ul>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
