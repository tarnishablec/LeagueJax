import type React from "react";
import { entries, mergeDeep, sortBy } from "remeda";
import type {
  I18nLocaleBundle,
  NavItem,
  RouteContribution,
  SidebarSlotContext,
  WebContribution,
} from "@/features/runtime/web-contract";
import { Jax, type JaxShard, type JaxShardClass } from "@/jax";
import { AutomationShard } from "./automation/manifest";
import { HistoryShard } from "./history/manifest";
import { OngoingGameShard } from "./ongoing-game/manifest";
import { SettingsShard } from "./settings/manifest";
import { ShellShard } from "./shell/manifest";
import { ToolsShard } from "./tools/manifest";

export interface RenderedSlot {
  id: string;
  node: React.ReactElement;
  order: number;
}

export const SHARD_CLASSES: readonly JaxShardClass<WebContribution>[] = [
  SettingsShard,
  ShellShard,
  HistoryShard,
  OngoingGameShard,
  AutomationShard,
  ToolsShard,
];

let jaxRuntime: Jax | null = null;
let jaxInitialization: Promise<void> | null = null;

const sortByOrder = <T extends { order?: number }>(entries: T[]): T[] => {
  return sortBy(entries, (entry) => entry.order ?? 99);
};

const routeMatches = (currentPath: string, routes?: string[]): boolean => {
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
};

const slotToRendered = <
  T extends { id: string; node: React.ReactElement; order?: number },
>(
  slots: T[],
): RenderedSlot[] => {
  return slots.map((slot) => ({
    id: slot.id,
    node: slot.node,
    order: slot.order ?? 99,
  }));
};

const getJaxRuntime = (): Jax => {
  if (!jaxRuntime) {
    throw new Error("[registry] Jax runtime is not initialized.");
  }
  return jaxRuntime;
};

const listWebShards = (): WebContribution[] => {
  return getJaxRuntime().listShards() as WebContribution[];
};

export const initializeWebShards = async (): Promise<void> => {
  if (jaxRuntime) {
    return;
  }

  if (jaxInitialization) {
    await jaxInitialization;
    return;
  }

  jaxInitialization = (async () => {
    const runtime = new Jax().registerMany(SHARD_CLASSES).build();
    const report = await runtime.start();
    if (report.failed.length > 0) {
      const failedIds = report.failed.map((item) => String(item.id)).join(", ");
      throw new Error(`[registry] Shard startup failed: ${failedIds}`);
    }
    jaxRuntime = runtime;
  })();

  try {
    await jaxInitialization;
  } finally {
    jaxInitialization = null;
  }
};

export const shutdownWebShards = async (): Promise<void> => {
  if (!jaxRuntime) {
    return;
  }

  await jaxRuntime.shutdown();
  jaxRuntime = null;
};

export const getRouteContributions = (): RouteContribution[] => {
  const routes = listWebShards().flatMap((shard) => shard.routes?.() ?? []);
  return sortByOrder(routes);
};

export const getNavItems = (
  section: NavItem["section"] = "main",
): NavItem[] => {
  const items = listWebShards().flatMap((shard) => shard.navItems?.() ?? []);
  return sortByOrder(items).filter(
    (item) => (item.section ?? "main") === section,
  );
};

export const getToolbarSlots = (currentPath: string): RenderedSlot[] => {
  const slots = listWebShards().flatMap(
    (shard) => shard.toolbarSlots?.() ?? [],
  );
  const visible = sortByOrder(slots).filter((slot) =>
    routeMatches(currentPath, slot.routes),
  );
  return slotToRendered(visible);
};

export const getTitlebarSlots = (currentPath: string): RenderedSlot[] => {
  const slots = listWebShards().flatMap(
    (shard) => shard.titlebarSlots?.() ?? [],
  );
  const visible = sortByOrder(slots).filter((slot) =>
    routeMatches(currentPath, slot.routes),
  );
  return slotToRendered(visible);
};

export const getSidebarSlots = (
  context: SidebarSlotContext,
): RenderedSlot[] => {
  const slots = listWebShards().flatMap(
    (shard) => shard.sidebarSlots?.() ?? [],
  );
  const visible = sortByOrder(slots).filter((slot) =>
    routeMatches(context.currentPath, slot.routes),
  );

  return visible.map((slot) => ({
    id: slot.id,
    order: slot.order ?? 99,
    node: slot.render(context),
  }));
};

export const getMergedI18nResources = (): I18nLocaleBundle => {
  const merged: I18nLocaleBundle = {};

  for (const shard of listWebShards()) {
    const resources = shard.i18nResources?.();
    if (!resources) {
      continue;
    }

    for (const [locale, bundle] of entries(resources)) {
      const localeTarget = merged[locale] ?? {};
      merged[locale] = mergeDeep(localeTarget, bundle);
    }
  }

  return merged;
};

export const getShardInstance = <T extends JaxShard>(
  shardClass: JaxShardClass<T>,
): T => {
  return getJaxRuntime().getShard(shardClass);
};
