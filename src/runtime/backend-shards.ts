import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ShardInfoDto, ShardsSnapshotDto } from "@/bindings/shards";

const normalizeShardId = (id: string): string => id.toLowerCase();

const describeShard = (shard: ShardInfoDto | undefined, id: string): string => {
  if (!shard) {
    return id;
  }
  return `${shard.label} (${shard.id})`;
};

const buildShardMap = (
  snapshot: ShardsSnapshotDto,
): Map<string, ShardInfoDto> => {
  return new Map(
    snapshot.shards.map((shard) => [normalizeShardId(shard.id), shard]),
  );
};

const collectPendingShardDescriptions = (
  snapshot: ShardsSnapshotDto,
  requiredIds: readonly string[],
): string[] => {
  const shards = buildShardMap(snapshot);
  const pending: string[] = [];

  for (const id of requiredIds) {
    const shard = shards.get(id);
    if (!shard) {
      pending.push(describeShard(shard, id));
      continue;
    }

    switch (shard.status.kind) {
      case "running":
        if (shard.setupDurationMs == null) {
          pending.push(describeShard(shard, id));
        }
        break;
      case "failed":
        throw new Error(
          `Backend shard ${describeShard(shard, id)} failed: ${shard.status.error}`,
        );
      case "skipped":
        throw new Error(
          `Backend shard ${describeShard(shard, id)} was skipped.`,
        );
    }
  }

  return pending;
};

export async function waitBackendShards(
  shardIds: readonly string[],
  timeoutMs: number,
): Promise<ShardsSnapshotDto> {
  const requiredIds = [...new Set(shardIds.map(normalizeShardId))];
  if (requiredIds.length === 0) {
    return invoke<ShardsSnapshotDto>("get_shards_status");
  }

  let inspectSnapshot: ((snapshot: ShardsSnapshotDto) => void) | null = null;
  const unlisten = await listen<ShardsSnapshotDto>(
    "shards_status_changed",
    (event) => inspectSnapshot?.(event.payload),
  );

  try {
    return await new Promise<ShardsSnapshotDto>((resolve, reject) => {
      let settled = false;
      let timeoutId: number | null = null;

      const cleanup = (): boolean => {
        if (settled) {
          return false;
        }
        settled = true;
        inspectSnapshot = null;
        if (timeoutId != null) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
        return true;
      };

      const resolveReady = (snapshot: ShardsSnapshotDto): void => {
        if (cleanup()) {
          resolve(snapshot);
        }
      };

      const rejectWait = (error: Error): void => {
        if (cleanup()) {
          reject(error);
        }
      };

      timeoutId = window.setTimeout(() => {
        const joined = requiredIds.join(", ");
        rejectWait(
          new Error(
            `Timed out after ${timeoutMs}ms waiting for backend shards: ${joined}`,
          ),
        );
      }, timeoutMs);

      inspectSnapshot = (snapshot) => {
        try {
          const pending = collectPendingShardDescriptions(
            snapshot,
            requiredIds,
          );
          if (pending.length === 0) {
            resolveReady(snapshot);
          }
        } catch (error) {
          rejectWait(error instanceof Error ? error : new Error(String(error)));
        }
      };

      invoke<ShardsSnapshotDto>("get_shards_status").then(
        (snapshot) => inspectSnapshot?.(snapshot),
        (error: unknown) => {
          rejectWait(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  } finally {
    unlisten();
  }
}
