import type React from "react";
import type {
  I18nLocaleBundle,
  NavItem,
  RouteContribution,
  SettingsSection,
  SidebarSlotContext,
  WebShard,
} from "@/jax/shard/web-shard";
import { automationShard } from "./automation/manifest";
import { historyShard } from "./history/manifest";
import { gameShard } from "./ongoing-game/manifest";
import { settingsShard } from "./settings/manifest";
import { shellShard } from "./shell/manifest";
import { toolsShard } from "./tools/manifest";

export interface RenderedSlot {
  id: string;
  node: React.ReactElement;
  order: number;
}

export const SHARD_REGISTRY: WebShard[] = [
  shellShard,
  historyShard,
  gameShard,
  automationShard,
  toolsShard,
  settingsShard,
];

let storesInitialized = false;

function sortByOrder<T extends { order?: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

function routeMatches(currentPath: string, routes?: string[]): boolean {
  if (!routes || routes.length === 0) {
    return true;
  }

  return routes.some((route) => {
    if (route === "*") {
      return true;
    }
    if (route === "/") {
      return currentPath === route;
    }
    return currentPath === route || currentPath.startsWith(`${route}/`);
  });
}

function slotToRendered<
  T extends { id: string; node: React.ReactElement; order?: number },
>(
  slots: T[],
): RenderedSlot[] {
  return slots.map((slot) => ({
    id: slot.id,
    node: slot.node,
    order: slot.order ?? 99,
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (isRecord(current) && isRecord(value)) {
      target[key] = deepMerge(current, value);
      continue;
    }
    target[key] = value;
  }
  return target;
}

export function initializeWebShards(): void {
  if (storesInitialized) {
    return;
  }

  for (const shard of SHARD_REGISTRY) {
    shard.setupStores?.();
  }

  storesInitialized = true;
}

export function getRouteContributions(): RouteContribution[] {
  const routes = SHARD_REGISTRY.flatMap((shard) => shard.routes?.() ?? []);
  return sortByOrder(routes);
}

export function getNavItems(section: NavItem["section"] = "main"): NavItem[] {
  const items = SHARD_REGISTRY.flatMap((shard) => shard.navItems?.() ?? []);
  return sortByOrder(items).filter((item) => (item.section ?? "main") === section);
}

export function getToolbarSlots(currentPath: string): RenderedSlot[] {
  const slots = SHARD_REGISTRY.flatMap((shard) => shard.toolbarSlots?.() ?? []);
  const visible = sortByOrder(slots).filter((slot) =>
    routeMatches(currentPath, slot.routes),
  );
  return slotToRendered(visible);
}

export function getTitlebarSlots(currentPath: string): RenderedSlot[] {
  const slots = SHARD_REGISTRY.flatMap((shard) => shard.titlebarSlots?.() ?? []);
  const visible = sortByOrder(slots).filter((slot) =>
    routeMatches(currentPath, slot.routes),
  );
  return slotToRendered(visible);
}

export function getSidebarSlots(context: SidebarSlotContext): RenderedSlot[] {
  const slots = SHARD_REGISTRY.flatMap((shard) => shard.sidebarSlots?.() ?? []);
  const visible = sortByOrder(slots).filter((slot) =>
    routeMatches(context.currentPath, slot.routes),
  );

  return visible.map((slot) => ({
    id: slot.id,
    order: slot.order ?? 99,
    node: slot.render(context),
  }));
}

export function getSettingsSections(): SettingsSection[] {
  const sections = SHARD_REGISTRY.flatMap(
    (shard) => shard.settingsSections?.() ?? [],
  );
  return sortByOrder(sections);
}

export function getMergedI18nResources(): I18nLocaleBundle {
  const merged: I18nLocaleBundle = {};

  for (const shard of SHARD_REGISTRY) {
    const resources = shard.i18nResources?.();
    if (!resources) {
      continue;
    }

    for (const [locale, bundle] of Object.entries(resources)) {
      const localeTarget = (merged[locale] ??= {});
      deepMerge(localeTarget, bundle);
    }
  }

  return merged;
}
