import { DirectedGraph } from "graphology";
import { AppError } from "@/infra/errors";
import { createLogger } from "@/infra/logger";

declare const __shardId: unique symbol;

export type ShardId = string & { readonly [__shardId]: never };

export const shardId = (uuid: string): ShardId => {
  return uuid as ShardId;
};

type LifecycleResult = void | Promise<void>;

export interface Shard {
  id(): ShardId;
  dependsOn?(): readonly ShardId[];
  setup?(jax: Jax): LifecycleResult;
  teardown?(jax: Jax): LifecycleResult;
}

export interface StartupShardError {
  id: ShardId;
  error: unknown;
}

export interface StartupReport {
  failed: StartupShardError[];
  skipped: ShardId[];
  durations: Map<ShardId, number>;
}

interface ShardRegistry {
  graph: DirectedGraph<{ shard: Shard }>;
  byId: Map<ShardId, Shard>;
  startupOrder: ShardId[];
}

const logger = createLogger("jax");

export class Jax {
  private readonly pending = new Map<ShardId, Shard>();
  private registry: ShardRegistry | null = null;
  private readonly shardInstancesById = new Map<ShardId, Shard>();
  private started = false;
  private startupReport: StartupReport | null = null;

  public constructor() {
    logger.debug("Jax runtime created");
  }

  public register(shard: Shard): this {
    const id = shard.id();

    if (this.started) {
      throw AppError.JaxRegisterAfterStart(String(id));
    }

    const existing = this.pending.get(id);
    if (existing && existing !== shard) {
      throw AppError.JaxDuplicateShardId(
        String(id),
        shard.constructor.name,
        existing.constructor.name,
      );
    }

    if (existing === shard) {
      logger.debug(
        { shardId: String(id) },
        "Skipping duplicate shard instance",
      );
      return this;
    }

    this.pending.set(id, shard);
    this.registry = null;
    this.shardInstancesById.clear();
    logger.debug(
      { shardId: String(id), pendingCount: this.pending.size },
      "Registered shard",
    );
    return this;
  }

  public build(): this {
    if (this.started) {
      throw AppError.JaxRebuildAfterStart();
    }

    logger.info({ pendingCount: this.pending.size }, "Building shard registry");

    const graph = new DirectedGraph<{ shard: Shard }>();
    const byId = new Map<ShardId, Shard>();
    const dependenciesById = new Map<ShardId, readonly ShardId[]>();

    this.shardInstancesById.clear();

    for (const [id, shard] of this.pending) {
      byId.set(id, shard);
      dependenciesById.set(id, shard.dependsOn?.() ?? []);
      this.shardInstancesById.set(id, shard);
      graph.addNode(id, { shard });
    }

    for (const [id, dependencies] of dependenciesById) {
      for (const dependencyId of dependencies) {
        if (!byId.has(dependencyId)) {
          throw AppError.JaxMissingDependency(String(dependencyId), String(id));
        }
        graph.addDirectedEdge(dependencyId, id);
      }
    }

    const startupOrder = this.topologicalSort(byId, graph);

    this.registry = { graph, byId, startupOrder };

    logger.info(
      {
        nodeCount: byId.size,
        edgeCount: graph.size,
        startupOrder: startupOrder.map((id) => String(id)),
      },
      "Shard registry built",
    );

    return this;
  }

  public async start(): Promise<StartupReport> {
    const registry = this.requireRegistry();
    if (this.started) {
      logger.debug("Jax start skipped because runtime is already started");
      return { failed: [], skipped: [], durations: new Map() };
    }

    logger.info(
      { shardCount: registry.startupOrder.length },
      "Starting shards",
    );

    const report: StartupReport = {
      failed: [],
      skipped: [],
      durations: new Map(),
    };
    const blocked = new Set<ShardId>();

    for (const id of registry.startupOrder) {
      if (blocked.has(id)) {
        report.skipped.push(id);
        logger.warn({ shardId: String(id) }, "Skipping blocked shard");
        continue;
      }

      const shard = registry.byId.get(id);
      if (!shard) {
        throw AppError.JaxInternalUnavailableDuringStart(String(id));
      }

      try {
        logger.debug({ shardId: String(id) }, "Running shard setup");
        const startTime = performance.now();
        await shard.setup?.(this);
        const elapsed = performance.now() - startTime;
        report.durations.set(id, elapsed);
        logger.info({ shardId: String(id) }, "Shard setup completed");
      } catch (error) {
        report.failed.push({ id, error });
        logger.error(
          { shardId: String(id), error },
          "Shard setup failed; marking descendants as skipped",
        );
        this.markDescendantsBlocked(registry.graph, id, blocked);
      }
    }

    this.started = true;
    this.startupReport = report;
    logger.info(
      {
        failedCount: report.failed.length,
        skippedCount: report.skipped.length,
      },
      "Shard startup finished",
    );
    return report;
  }

  public async stop(): Promise<void> {
    const registry = this.requireRegistry();
    logger.info(
      { shardCount: registry.startupOrder.length },
      "Shutting down shards",
    );

    const teardownOrder = [...registry.startupOrder].reverse();
    const errors: Array<{ shardId: ShardId; error: unknown }> = [];

    for (const id of teardownOrder) {
      const shard = registry.byId.get(id);
      if (!shard) {
        continue;
      }

      try {
        await shard.teardown?.(this);
        logger.info({ shardId: String(id) }, "Shard teardown completed");
      } catch (error) {
        errors.push({ shardId: id, error });
        logger.error({ shardId: String(id), error }, "Shard teardown failed");
      }
    }

    this.started = false;
    if (errors.length > 0) {
      const firstError = errors[0];
      throw AppError.JaxShutdownFailed(String(firstError.shardId)).with({
        cause: firstError.error,
      });
    }

    logger.info("Shard shutdown finished");
  }

  // noinspection JSUnusedGlobalSymbols
  public getShardById(id: ShardId): Shard {
    this.requireRegistry();

    const shard = this.shardInstancesById.get(id);
    if (!shard) {
      throw AppError.JaxShardUnavailable(String(id));
    }
    return shard;
  }

  public getShard<T extends Shard>(clazz: new () => T): T {
    this.requireRegistry();

    const shard = this.shardInstancesById
      .values()
      .find((instance) => instance instanceof clazz);
    if (!shard) {
      throw AppError.JaxShardUnavailable(clazz.name);
    }

    return shard as T;
  }

  public listShards(): Shard[] {
    this.requireRegistry();
    return [...this.shardInstancesById.values()];
  }

  public getStartupReport(): StartupReport | null {
    return this.startupReport;
  }

  private requireRegistry(): ShardRegistry {
    if (!this.registry) {
      throw AppError.JaxRegistryNotBuilt();
    }
    return this.registry;
  }

  private topologicalSort(
    byId: Map<ShardId, Shard>,
    graph: DirectedGraph<{ shard: Shard }>,
  ): ShardId[] {
    const inDegree = new Map<ShardId, number>();
    const queue: ShardId[] = [];
    const order: ShardId[] = [];

    for (const id of byId.keys()) {
      const degree = graph.inDegree(id);
      inDegree.set(id, degree);
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) {
        break;
      }

      order.push(id);

      for (const neighbor of graph.outboundNeighbors(id)) {
        const target = shardId(neighbor);
        const degree = (inDegree.get(target) ?? 0) - 1;
        inDegree.set(target, degree);
        if (degree === 0) {
          queue.push(target);
        }
      }
    }

    if (order.length !== byId.size) {
      const cyclicNodes = [...byId.keys()].filter((id) => !order.includes(id));
      throw AppError.JaxCycleDetected(
        cyclicNodes.map((id) => String(id)).join(" -> "),
      );
    }

    return order;
  }

  private markDescendantsBlocked(
    graph: DirectedGraph<{ shard: Shard }>,
    root: ShardId,
    blocked: Set<ShardId>,
  ): void {
    const queue: ShardId[] = [root];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      for (const next of graph.outboundNeighbors(current)) {
        const nextId = shardId(next);
        if (blocked.has(nextId)) {
          continue;
        }
        blocked.add(nextId);
        queue.push(nextId);
      }
    }
  }
}
