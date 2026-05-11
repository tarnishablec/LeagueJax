import type { Resource } from "i18next";

export const notificationsI18n: Resource = {
  en: {
    notifications: {
      center: {
        title: "Notifications",
        clear: "Clear",
        empty: "No notifications",
        open: "Open notifications",
        openWithUnread: "Open notifications, {{count}} unread",
      },
    },
  },
  "zh-CN": {
    notifications: {
      center: {
        title: "通知",
        clear: "清空",
        empty: "暂无通知",
        open: "打开通知",
        openWithUnread: "打开通知，{{count}} 条未读",
      },
    },
  },
};
