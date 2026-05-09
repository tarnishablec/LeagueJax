import type React from "react";
import { sortBy } from "remeda";
import { AppError } from "@/infra/errors";
import { createLogger } from "@/infra/logger";
import { Jax } from "@/jax";
import type {
  NavItem,
  RouteContribution,
  RouteLayout,
  SidebarSlotContext,
  WebShard,
} from "@/runtime/web-contract";

export interface RenderedSlot {
  id: string;
  node: React.ReactElement;
  order: number;
}

let jaxRuntime: Jax | null = import.meta.hot?.data?.jaxRuntime ?? null;
let jaxInitialization: Promise<void> | null = null;
const logger = createLogger("registry");

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

export const getJaxRuntime = (): Jax => {
  if (!jaxRuntime) {
    throw AppError.RegistryRuntimeNotInitialized();
  }
  return jaxRuntime;
};

const listWebShards = (): WebShard[] => {
  return getJaxRuntime().listShards() as WebShard[];
};

export const initializeWebShards = async (
  shards: WebShard[],
): Promise<void> => {
  if (jaxRuntime) {
    logger.debug("Web shards already initialized; skipping");
    return;
  }

  if (jaxInitialization) {
    logger.debug("Web shard initialization already in progress; awaiting");
    await jaxInitialization;
    return;
  }

  jaxInitialization = (async () => {
    logger.info({ shardCount: shards.length }, "Initializing web shards");
    const runtime = shards
      .reduce((runtime, shard) => runtime.register(shard), new Jax())
      .build();
    const report = await runtime.start();
    if (report.failed.length > 0) {
      const failedIds = report.failed.map((item) => String(item.id)).join(", ");
      logger.error(
        {
          failed: report.failed.map((item) => ({
            id: String(item.id),
            error: item.error,
          })),
          skipped: report.skipped.map((id) => String(id)),
        },
        "Web shard startup failed",
      );
      throw AppError.RegistryShardStartupFailed(failedIds);
    }

    logger.info(
      { skipped: report.skipped.map((id) => String(id)) },
      "Web shard startup completed",
    );
    jaxRuntime = runtime;
    if (import.meta.hot) import.meta.hot.data.jaxRuntime = runtime;
  })();

  try {
    await jaxInitialization;
  } finally {
    jaxInitialization = null;
  }
};

export const shutdownWebShards = async (): Promise<void> => {
  if (!jaxRuntime) {
    logger.debug(
      "Web shard shutdown skipped because runtime is not initialized",
    );
    return;
  }

  logger.info("Shutting down web shards");
  await jaxRuntime.stop();
  jaxRuntime = null;
  if (import.meta.hot) import.meta.hot.data.jaxRuntime = null;
  logger.info("Web shard shutdown completed");
};

export const getRouteContributions = (
  layout: RouteLayout = "main",
): RouteContribution[] => {
  const routes = listWebShards().flatMap((shard) =>
    (shard.routes?.() ?? []).filter(
      (route) => (route.layout ?? "main") === layout,
    ),
  );
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
