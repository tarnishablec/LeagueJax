import { DirectedGraph } from "graphology";

declare const __shardId: unique symbol;

export type ShardId = string & { readonly [__shardId]: never };

export const shardId = (uuid: string): ShardId => {
  return uuid as ShardId;
};

type ShardLifecycleResult = void | Promise<void>;

export interface JaxShard {
  setup?(jax: Jax): ShardLifecycleResult;
  teardown?(jax: Jax): ShardLifecycleResult;
}

export type JaxShardClass<T extends JaxShard = JaxShard> = {
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

export class Jax {
  private readonly pending = new Map<ShardId, JaxShardClass>();
  private registry: ShardRegistry | null = null;
  private readonly shardInstancesByClass = new Map<JaxShardClass, JaxShard>();
  private readonly shardInstancesById = new Map<ShardId, JaxShard>();
  private started = false;

  public constructor(shardClasses: readonly JaxShardClass[] = []) {
    this.registerMany(shardClasses);
  }

  public register<T extends JaxShard>(shardClass: JaxShardClass<T>): this {
    if (this.started) {
      throw new Error(
        `[jax] Cannot register shard "${String(shardClass.id)}" after start().`,
      );
    }

    const existing = this.pending.get(shardClass.id);
    if (existing && existing !== shardClass) {
      throw new Error(
        `[jax] Duplicate shard id "${String(shardClass.id)}" on "${shardClass.name}" and "${existing.name}".`,
      );
    }

    this.pending.set(shardClass.id, shardClass);
    this.registry = null;
    this.shardInstancesByClass.clear();
    this.shardInstancesById.clear();
    return this;
  }

  public registerMany(shardClasses: readonly JaxShardClass[]): this {
    for (const shardClass of shardClasses) {
      this.register(shardClass);
    }
    return this;
  }

  public build(): this {
    if (this.started) {
      throw new Error("[jax] Cannot rebuild after start().");
    }

    const graph = new DirectedGraph<{ shardClass: JaxShardClass }>();
    const byId = new Map<ShardId, JaxShardClass>();

    for (const shardClass of this.pending.values()) {
      byId.set(shardClass.id, shardClass);
      graph.addNode(shardClass.id, { shardClass });
    }

    for (const shardClass of this.pending.values()) {
      for (const dependencyId of shardClass.dependsOn ?? []) {
        if (!byId.has(dependencyId)) {
          throw new Error(
            `[jax] Missing dependency "${String(dependencyId)}" required by "${String(shardClass.id)}".`,
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
        throw new Error(
          `[jax] Internal error: shard "${String(id)}" is missing.`,
        );
      }

      const instance = new shardClass();
      this.shardInstancesByClass.set(shardClass, instance);
      this.shardInstancesById.set(id, instance);
    }

    return this;
  }

  public async start(): Promise<StartupReport> {
    const registry = this.requireRegistry();
    if (this.started) {
      return { failed: [], skipped: [] };
    }

    const report: StartupReport = { failed: [], skipped: [] };
    const blocked = new Set<ShardId>();

    for (const id of registry.startupOrder) {
      if (blocked.has(id)) {
        report.skipped.push(id);
        continue;
      }

      const shardClass = registry.byId.get(id);
      const shardInstance =
        (shardClass && this.shardInstancesByClass.get(shardClass)) ?? null;
      if (!shardClass || !shardInstance) {
        throw new Error(
          `[jax] Internal error: shard "${String(id)}" is unavailable during start().`,
        );
      }

      try {
        await shardInstance.setup?.(this);
      } catch (error) {
        report.failed.push({ id, error });
        this.markDescendantsBlocked(registry.graph, id, blocked);
      }
    }

    this.started = true;
    return report;
  }

  public async shutdown(): Promise<void> {
    const registry = this.requireRegistry();

    const teardownOrder = [...registry.startupOrder].reverse();
    const errors: unknown[] = [];

    for (const id of teardownOrder) {
      const shardClass = registry.byId.get(id);
      const shardInstance =
        (shardClass && this.shardInstancesByClass.get(shardClass)) ?? null;
      if (!shardInstance) {
        continue;
      }

      try {
        await shardInstance.teardown?.(this);
      } catch (error) {
        errors.push(error);
      }
    }

    this.started = false;
    if (errors.length > 0) {
      throw errors[0];
    }
  }

  public async stop(): Promise<void> {
    await this.shutdown();
  }

  public getShard<T extends JaxShard>(shardClass: JaxShardClass<T>): T {
    this.requireRegistry();

    const shard = this.shardInstancesByClass.get(shardClass);
    if (!shard) {
      throw new Error(
        `[jax] Shard "${String(shardClass.id)}" is not available. Did you register/build it?`,
      );
    }
    return shard as T;
  }

  public getShardById(id: ShardId): JaxShard {
    this.requireRegistry();

    const shard = this.shardInstancesById.get(id);
    if (!shard) {
      throw new Error(
        `[jax] Shard "${String(id)}" is not available. Did you register/build it?`,
      );
    }
    return shard;
  }

  public listShards(): JaxShard[] {
    this.requireRegistry();
    return [...this.shardInstancesById.values()];
  }

  private requireRegistry(): ShardRegistry {
    if (!this.registry) {
      throw new Error(
        "[jax] Registry is empty. Call register().build() first.",
      );
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
      throw new Error(
        `[jax] Circular dependency detected: ${cyclicNodes.map((id) => String(id)).join(" -> ")}`,
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
