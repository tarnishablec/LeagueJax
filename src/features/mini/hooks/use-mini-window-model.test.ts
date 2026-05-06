import { describe, expect, test } from "bun:test";
import { resolveMiniQueueIconSrc } from "./use-mini-window-model";

describe("resolveMiniQueueIconSrc", () => {
  test("prefers the known queue-specific map asset over the raw gameflow map asset", () => {
    expect(
      resolveMiniQueueIconSrc(
        {
          assets: {
            "game-select-icon-active": "/lol-game-queues/hextech-aram.png",
          },
        },
        {
          assets: {
            "game-select-icon-active": "/lol-game-maps/aram.png",
          },
        },
      ),
    ).toBe("/lol-game-queues/hextech-aram.png");
  });

  test("falls back to the raw gameflow map asset when no known map asset is available", () => {
    expect(
      resolveMiniQueueIconSrc(null, {
        assets: {
          "game-select-icon-active": "/lol-game-maps/summoners-rift.png",
        },
      }),
    ).toBe("/lol-game-maps/summoners-rift.png");
  });
});
