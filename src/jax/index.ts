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
  setup?(jax: Jax): LifecycleResult;
  teardown?(jax: Jax): LifecycleResult;
}

export type JaxShardClass<T extends Shard = Shard> = {
  new (): T;
  id: ShardId;
  dependsOn?: readonly ShardId[];
};

export interface StartupShardError {
  id: ShardId;
  error: unknown;
}

export interface StartupReport {
  failed: StartupShardError[];
  skipped: ShardId[];
}

interface ShardRegistry {
  graph: DirectedGraph<{ shardClass: JaxShardClass }>;
  byId: Map<ShardId, JaxShardClass>;
  startupOrder: ShardId[];
}

const logger = createLogger("jax");

export class Jax {
  private readonly pending = new Map<ShardId, JaxShardClass>();
  private registry: ShardRegistry | null = null;
  private readonly shardInstancesByClass = new Map<JaxShardClass, Shard>();
  private readonly shardInstancesById = new Map<ShardId, Shard>();
  private started = false;

  public constructor(shardClasses: readonly JaxShardClass[] = []) {
    this.registerMany(shardClasses);
    logger.debug(
      { shardClassCount: shardClasses.length },
      "Jax runtime created",
    );
  }

  public register<T extends Shard>(shardClass: JaxShardClass<T>): this {
    if (this.started) {
      throw AppError.JaxRegisterAfterStart(String(shardClass.id));
    }

    const existing = this.pending.get(shardClass.id);
    if (existing && existing !== shardClass) {
      throw AppError.JaxDuplicateShardId(
        String(shardClass.id),
        shardClass.name,
        existing.name,
      );
    }

    this.pending.set(shardClass.id, shardClass);
    this.registry = null;
    this.shardInstancesByClass.clear();
    this.shardInstancesById.clear();
    logger.debug(
      { shardId: String(shardClass.id), pendingCount: this.pending.size },
      "Registered shard class",
    );
    return this;
  }

  public registerMany(shardClasses: readonly JaxShardClass[]): this {
    for (const shardClass of shardClasses) {
      this.register(shardClass);
    }
    logger.debug(
      { shardClassCount: shardClasses.length, pendingCount: this.pending.size },
      "Registered shard class batch",
    );
    return this;
  }

  public build(): this {
    if (this.started) {
      throw AppError.JaxRebuildAfterStart();
    }

    logger.info({ pendingCount: this.pending.size }, "Building shard registry");

    const graph = new DirectedGraph<{ shardClass: JaxShardClass }>();
    const byId = new Map<ShardId, JaxShardClass>();

    for (const shardClass of this.pending.values()) {
      byId.set(shardClass.id, shardClass);
      graph.addNode(shardClass.id, { shardClass });
    }

    for (const shardClass of this.pending.values()) {
      for (const dependencyId of shardClass.dependsOn ?? []) {
        if (!byId.has(dependencyId)) {
          throw AppError.JaxMissingDependency(
            String(dependencyId),
            String(shardClass.id),
          );
        }
        graph.addDirectedEdge(dependencyId, shardClass.id);
      }
    }

    const startupOrder = this.topologicalSort(byId, graph);

    this.registry = { graph, byId, startupOrder };
    this.shardInstancesByClass.clear();
    this.shardInstancesById.clear();

    for (const id of startupOrder) {
      const shardClass = byId.get(id);
      if (!shardClass) {
        throw AppError.JaxInternalMissingShard(String(id));
      }

      const instance = new shardClass();
      this.shardInstancesByClass.set(shardClass, instance);
      this.shardInstancesById.set(id, instance);
    }

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
      return { failed: [], skipped: [] };
    }

    logger.info(
      { shardCount: registry.startupOrder.length },
      "Starting shards",
    );

    const report: StartupReport = { failed: [], skipped: [] };
    const blocked = new Set<ShardId>();

    for (const id of registry.startupOrder) {
      if (blocked.has(id)) {
        report.skipped.push(id);
        logger.warn({ shardId: String(id) }, "Skipping blocked shard");
        continue;
      }

      const shardClass = registry.byId.get(id);
      const shardInstance =
        (shardClass && this.shardInstancesByClass.get(shardClass)) ?? null;
      if (!shardClass || !shardInstance) {
        throw AppError.JaxInternalUnavailableDuringStart(String(id));
      }

      try {
        logger.debug({ shardId: String(id) }, "Running shard setup");
        await shardInstance.setup?.(this);
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
    logger.info(
      {
        failedCount: report.failed.length,
        skippedCount: report.skipped.length,
      },
      "Shard startup finished",
    );
    return report;
  }

  public async shutdown(): Promise<void> {
    const registry = this.requireRegistry();
    logger.info(
      { shardCount: registry.startupOrder.length },
      "Shutting down shards",
    );

    const teardownOrder = [...registry.startupOrder].reverse();
    const errors: Array<{ shardId: ShardId; error: unknown }> = [];

    for (const id of teardownOrder) {
      const shardClass = registry.byId.get(id);
      const shardInstance =
        (shardClass && this.shardInstancesByClass.get(shardClass)) ?? null;
      if (!shardInstance) {
        continue;
      }

      try {
        await shardInstance.teardown?.(this);
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

  public async stop(): Promise<void> {
    await this.shutdown();
  }

  public getShard<T extends Shard>(shardClass: JaxShardClass<T>): T {
    this.requireRegistry();

    const shard = this.shardInstancesByClass.get(shardClass);
    if (!shard) {
      throw AppError.JaxShardUnavailable(String(shardClass.id));
    }
    return shard as T;
  }

  public getShardById(id: ShardId): Shard {
    this.requireRegistry();

    const shard = this.shardInstancesById.get(id);
    if (!shard) {
      throw AppError.JaxShardUnavailable(String(id));
    }
    return shard;
  }

  public listShards(): Shard[] {
    this.requireRegistry();
    return [...this.shardInstancesById.values()];
  }

  private requireRegistry(): ShardRegistry {
    if (!this.registry) {
      throw AppError.JaxRegistryNotBuilt();
    }
    return this.registry;
  }

  private topologicalSort(
    byId: Map<ShardId, JaxShardClass>,
    graph: DirectedGraph<{ shardClass: JaxShardClass }>,
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
    graph: DirectedGraph<{ shardClass: JaxShardClass }>,
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
