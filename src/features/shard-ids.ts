import { type ShardId, shardId } from "@/jax";

/**
 * Canonical shard UUID constants.
 * Each value MUST match the corresponding `pub const ID: Uuid` in the Rust shard file.
 */
export const SHARD_IDS = {
  // Frontend-only
  HISTORY: shardId("00000000-0000-4000-8000-100000000001"),
  AUTOMATION: shardId("00000000-0000-4000-8000-100000000002"),
  TOOLS: shardId("00000000-0000-4000-8000-100000000003"),
  I18N: shardId("00000000-0000-4000-8000-100000000004"),
  SHELL: shardId("00000000-0000-4000-8000-100000000005"),
  MINI: shardId("00000000-0000-4000-8000-100000000006"),
  WINDOW_EFFECT: shardId("00000000-0000-4000-8000-100000000007"),
  TRAY: shardId("eb4fd044-6a85-4d25-a59b-d7ec6d605d17"),

  // Dual-side (use backend UUIDs)
  SETTINGS: shardId("b59f17b0-24ef-4ce1-a106-f430ec20457e"),
  AUTO_SELECT: shardId("2c98048a-4233-4aa4-b9d7-5d11282e1ad6"),
  AUTO_GAMEFLOW: shardId("e2701f9c-c27c-4ad8-8ff0-a993c7fb98ef"),
  AUTO_REPLY: shardId("4201e831-e67b-4264-b2c0-46f2397a2da3"),
  ONGOING_GAME: shardId("38121643-b79d-4382-9592-c647da511c1b"),
  SAVED_PLAYERS: shardId("0885405c-362d-45b6-b212-f943046c401f"),
  STATISTICS: shardId("e5eab397-efba-4ee0-8507-def244597f1b"),
  KEYBOARD: shardId("886fead7-3482-4c3f-a28b-20f5e972d221"),
  UPDATER: shardId("0adeb8a1-2f80-41af-a381-a852a08e1ab5"),
} as const satisfies Record<string, ShardId>;
