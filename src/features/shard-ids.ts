import { type ShardId, shardId } from "../types/shard-id";

/**
 * Canonical shard UUID constants.
 * Each value MUST match the corresponding `pub const ID: Uuid` in the Rust shard file.
 */
export const SHARD_IDS = {
  AUTO_SELECT: shardId("00000000-0000-4000-8000-000000000001"),
  AUTO_GAMEFLOW: shardId("00000000-0000-4000-8000-000000000002"),
  AUTO_REPLY: shardId("00000000-0000-4000-8000-000000000003"),
  ONGOING_GAME: shardId("00000000-0000-4000-8000-000000000004"),
  SAVED_PLAYERS: shardId("00000000-0000-4000-8000-000000000005"),
  STATISTICS: shardId("00000000-0000-4000-8000-000000000006"),
  KEYBOARD: shardId("00000000-0000-4000-8000-000000000007"),
  TRAY: shardId("00000000-0000-4000-8000-000000000008"),
  UPDATER: shardId("00000000-0000-4000-8000-000000000009"),
} as const satisfies Record<string, ShardId>;
