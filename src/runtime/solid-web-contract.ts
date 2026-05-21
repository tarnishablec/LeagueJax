import type { LucideIcon } from "lucide-solid";
import type { Component, JSX } from "solid-js";
import type { LocaleResource } from "@/i18n/types";
import type { Shard } from "@/jax";

export type SolidNavSection = "main" | "bottom";
export type SolidRouteLayout = "main" | "mini";

export interface SolidNavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  endAdornment?: JSX.Element;
  section?: SolidNavSection;
  order?: number;
}

export interface SolidRouteContribution {
  path?: string;
  index?: boolean;
  component: Component;
  children?: SolidRouteContribution[];
  layout?: SolidRouteLayout;
  order?: number;
}

export interface SolidToolbarSlot {
  id: string;
  node: JSX.Element;
  order?: number;
  routes?: string[];
}

export interface SolidTitlebarSlot {
  id: string;
  node: JSX.Element;
  order?: number;
  routes?: string[];
}

export interface SolidSidebarSlotContext {
  currentPath: string;
  collapsed: boolean;
  iconSize: number;
}

export interface SolidSidebarSlot {
  id: string;
  order?: number;
  routes?: string[];
  render: (context: SolidSidebarSlotContext) => JSX.Element;
}

export interface SolidWebShard extends Shard {
  routes?(): SolidRouteContribution[];
  navItems?(): SolidNavItem[];
  toolbarSlots?(): SolidToolbarSlot[];
  sidebarSlots?(): SolidSidebarSlot[];
  titlebarSlots?(): SolidTitlebarSlot[];
  i18nResources?(): LocaleResource;
}
