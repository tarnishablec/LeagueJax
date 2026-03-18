import type { LucideIcon } from "lucide-react";
import type React from "react";
import type { RouteObject } from "react-router";
import type { ShardId } from "./shard-id.ts";

export type NavSection = "main" | "bottom";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  section?: NavSection;
  order?: number;
}

export interface RouteContribution
  extends Pick<RouteObject, "path" | "index" | "element"> {
  order?: number;
}

export interface ToolbarSlot {
  id: string;
  node: React.ReactElement;
  order?: number;
  routes?: string[];
}

export interface TitlebarSlot {
  id: string;
  node: React.ReactElement;
  order?: number;
  routes?: string[];
}

export interface SidebarSlotContext {
  currentPath: string;
  collapsed: boolean;
  iconSize: number;
}

export interface SidebarSlot {
  id: string;
  order?: number;
  routes?: string[];
  render: (context: SidebarSlotContext) => React.ReactElement;
}

export interface SettingsSection {
  id: string;
  titleKey: string;
  node: React.ReactElement;
  order?: number;
}

export type I18nLocaleBundle = Record<string, Record<string, unknown>>;

/**
 * Web-side shard interface.
 * Static registry only: no runtime lifecycle orchestration.
 */
export interface WebShard {
  id(): ShardId;

  dependsOn?(): ShardId[];

  setupStores?(): void;

  routes?(): RouteContribution[];

  navItems?(): NavItem[];

  toolbarSlots?(): ToolbarSlot[];

  sidebarSlots?(): SidebarSlot[];

  titlebarSlots?(): TitlebarSlot[];

  settingsSections?(): SettingsSection[];

  i18nResources?(): I18nLocaleBundle;
}
