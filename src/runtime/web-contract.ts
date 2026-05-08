import type { Resource } from "i18next";
import type { LucideIcon } from "lucide-react";
import type React from "react";
import type { RouteObject } from "react-router";
import type { Shard } from "@/jax";

export type NavSection = "main" | "bottom";
export type RouteLayout = "main" | "mini";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  endAdornment?: React.ReactElement;
  section?: NavSection;
  order?: number;
}

export interface RouteContribution
  extends Pick<RouteObject, "path" | "index" | "element"> {
  children?: RouteContribution[];
  layout?: RouteLayout;
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

// export type I18nLocaleBundle = Record<string, Record<string, unknown>>;

export interface WebShard extends Shard {
  routes?(): RouteContribution[];
  navItems?(): NavItem[];
  toolbarSlots?(): ToolbarSlot[];
  sidebarSlots?(): SidebarSlot[];
  titlebarSlots?(): TitlebarSlot[];
  i18nResources?(): Resource;
}
