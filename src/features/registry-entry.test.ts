import { describe, expect, test } from "bun:test";
import {
  MAIN_WEB_SHARD_IDS,
  MINI_ONGOING_GAME_SHARD_LABEL,
  MINI_WEB_SHARD_IDS,
} from "./registry-entry";
import { SHARD_IDS } from "./shard-ids";

describe("window-specific web shard registries", () => {
  test("main registry keeps the full application feature set", () => {
    expect(MAIN_WEB_SHARD_IDS).toEqual([
      SHARD_IDS.SETTINGS,
      SHARD_IDS.WINDOW_EFFECT,
      SHARD_IDS.I18N,
      SHARD_IDS.UPDATER,
      SHARD_IDS.SHELL,
      SHARD_IDS.STATIC_CACHE,
      SHARD_IDS.TRAY,
      SHARD_IDS.MINI,
      SHARD_IDS.HISTORY,
      SHARD_IDS.REPLAY,
      SHARD_IDS.ONGOING_GAME,
      SHARD_IDS.AUTOMATION,
      SHARD_IDS.TOOLS,
    ]);
  });

  test("mini registry excludes main-window-only features", () => {
    expect(MINI_WEB_SHARD_IDS).toEqual([
      SHARD_IDS.SETTINGS,
      SHARD_IDS.WINDOW_EFFECT,
      SHARD_IDS.I18N,
      SHARD_IDS.STATIC_CACHE,
      SHARD_IDS.MINI,
      SHARD_IDS.ONGOING_GAME,
    ]);
    expect(MINI_WEB_SHARD_IDS).not.toContain(SHARD_IDS.HISTORY);
    expect(MINI_WEB_SHARD_IDS).not.toContain(SHARD_IDS.REPLAY);
    expect(MINI_WEB_SHARD_IDS).not.toContain(SHARD_IDS.TOOLS);
    expect(MINI_WEB_SHARD_IDS).not.toContain(SHARD_IDS.AUTOMATION);
    expect(MINI_WEB_SHARD_IDS).not.toContain(SHARD_IDS.SHELL);
    expect(MINI_WEB_SHARD_IDS).not.toContain(SHARD_IDS.TRAY);
    expect(MINI_WEB_SHARD_IDS).not.toContain(SHARD_IDS.UPDATER);
    expect(MINI_ONGOING_GAME_SHARD_LABEL).toBe("MiniOngoingGameShard");
  });
});
