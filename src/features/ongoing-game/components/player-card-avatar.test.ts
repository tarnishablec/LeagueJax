import { describe, expect, test } from "bun:test";
import { resolvePlayerCardAvatarSource } from "./player-card-avatar";

describe("resolvePlayerCardAvatarSource", () => {
  test("uses the selected champion avatar when a champion is available", () => {
    expect(
      resolvePlayerCardAvatarSource({
        championId: 24,
        profileIconId: 1234,
      }),
    ).toEqual({
      kind: "champion",
      championId: 24,
    });
  });

  test("falls back to the player profile icon before champion selection", () => {
    expect(
      resolvePlayerCardAvatarSource({
        championId: 0,
        profileIconId: 1234,
      }),
    ).toEqual({
      kind: "profile",
      profileIconId: 1234,
    });
  });
});
