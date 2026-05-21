import { sortBy } from "remeda";
import { AppError } from "@/infra/errors";
import { createLogger } from "@/infra/logger";
import { Jax } from "@/jax";
import type {
  SolidNavItem,
  SolidRouteContribution,
  SolidRouteLayout,
  SolidSidebarSlotContext,
  SolidWebShard,
} from "@/runtime/solid-web-contract";

export interface SolidRenderedSlot {
  id: string;
  node: import("solid-js").JSX.Element;
  order: number;
}

let solidJaxRuntime: Jax | null =
  import.meta.hot?.data?.solidJaxRuntime ?? null;
let solidJaxInitialization: Promise<void> | null = null;
const logger = createLogger("solid-registry");

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
  T extends {
    id: string;
    node: import("solid-js").JSX.Element;
    order?: number;
  },
>(
  slots: T[],
): SolidRenderedSlot[] => {
  return slots.map((slot) => ({
    id: slot.id,
    node: slot.node,
    order: slot.order ?? 99,
  }));
};

export const getSolidJaxRuntime = (): Jax => {
  if (!solidJaxRuntime) {
    throw AppError.RegistryRuntimeNotInitialized();
  }
  return solidJaxRuntime;
};

const listSolidWebShards = (): SolidWebShard[] => {
  return getSolidJaxRuntime().listShards() as SolidWebShard[];
};

export const initializeSolidWebShards = async (
  shards: SolidWebShard[],
): Promise<void> => {
  if (solidJaxRuntime) {
    logger.debug("Solid web shards already initialized; skipping");
    return;
  }

  if (solidJaxInitialization) {
    logger.debug(
      "Solid web shard initialization already in progress; awaiting",
    );
    await solidJaxInitialization;
    return;
  }

  solidJaxInitialization = (async () => {
    logger.info({ shardCount: shards.length }, "Initializing solid web shards");
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
        "Solid web shard startup failed",
      );
      throw AppError.RegistryShardStartupFailed(failedIds);
    }

    logger.info(
      { skipped: report.skipped.map((id) => String(id)) },
      "Solid web shard startup completed",
    );
    solidJaxRuntime = runtime;
    if (import.meta.hot) import.meta.hot.data.solidJaxRuntime = runtime;
  })();

  try {
    await solidJaxInitialization;
  } finally {
    solidJaxInitialization = null;
  }
};

export const shutdownSolidWebShards = async (): Promise<void> => {
  if (!solidJaxRuntime) {
    logger.debug(
      "Solid web shard shutdown skipped because runtime is not initialized",
    );
    return;
  }

  logger.info("Shutting down solid web shards");
  await solidJaxRuntime.stop();
  solidJaxRuntime = null;
  if (import.meta.hot) import.meta.hot.data.solidJaxRuntime = null;
  logger.info("Solid web shard shutdown completed");
};

export const getSolidRouteContributions = (
  layout: SolidRouteLayout = "main",
): SolidRouteContribution[] => {
  const routes = listSolidWebShards().flatMap((shard) =>
    (shard.routes?.() ?? []).filter(
      (route) => (route.layout ?? "main") === layout,
    ),
  );
  return sortByOrder(routes);
};

export const getSolidNavItems = (
  section: SolidNavItem["section"] = "main",
): SolidNavItem[] => {
  const items = listSolidWebShards().flatMap(
    (shard) => shard.navItems?.() ?? [],
  );
  return sortByOrder(items).filter(
    (item) => (item.section ?? "main") === section,
  );
};

export const getSolidToolbarSlots = (
  currentPath: string,
): SolidRenderedSlot[] => {
  const slots = listSolidWebShards().flatMap(
    (shard) => shard.toolbarSlots?.() ?? [],
  );
  const visible = sortByOrder(slots).filter((slot) =>
    routeMatches(currentPath, slot.routes),
  );
  return slotToRendered(visible);
};

export const getSolidTitlebarSlots = (
  currentPath: string,
): SolidRenderedSlot[] => {
  const slots = listSolidWebShards().flatMap(
    (shard) => shard.titlebarSlots?.() ?? [],
  );
  const visible = sortByOrder(slots).filter((slot) =>
    routeMatches(currentPath, slot.routes),
  );
  return slotToRendered(visible);
};

export const getSolidSidebarSlots = (
  context: SolidSidebarSlotContext,
): SolidRenderedSlot[] => {
  const slots = listSolidWebShards().flatMap(
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
