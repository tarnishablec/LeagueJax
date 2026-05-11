import type { SettingId } from "@/features/settings/types";

export type NotificationLevel = "info" | "warning" | "error";
export type NotificationSource = string;
export type NotificationSystemMode = "off" | "respectUserSetting" | "force";
export type NotificationValues = Record<string, string | number | boolean>;
export type NotificationClickHandler = (
  notification: AppNotification,
) => void | Promise<void>;

export interface NotificationDraft {
  source: NotificationSource;
  level: NotificationLevel;
  titleKey: string;
  bodyKey?: string;
  values?: NotificationValues;
  dedupeKey?: string;
  createdAt?: number;
  system?: NotificationSystemMode;
  systemSettingId?: SettingId;
  onClick?: NotificationClickHandler;
}

export interface AppNotification {
  id: string;
  source: NotificationSource;
  level: NotificationLevel;
  titleKey: string;
  bodyKey?: string;
  values: NotificationValues;
  dedupeKey?: string;
  createdAt: number;
  readAt?: number;
  system: NotificationSystemMode;
  systemSettingId?: SettingId;
  onClick?: NotificationClickHandler;
}
