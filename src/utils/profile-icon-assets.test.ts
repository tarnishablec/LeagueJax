import { describe, expect, test } from "bun:test";
import { resolveProfileIconAssetPath } from "./profile-icon-assets";

describe("resolveProfileIconAssetPath", () => {
  test("resolves profile icons to the League Client game-data asset path", () => {
    expect(resolveProfileIconAssetPath(588)).toBe(
      "/lol-game-data/assets/v1/profile-icons/588.jpg",
    );
  });

  test("does not resolve invalid profile icon ids", () => {
    expect(resolveProfileIconAssetPath(null)).toBeNull();
    expect(resolveProfileIconAssetPath(undefined)).toBeNull();
    expect(resolveProfileIconAssetPath(0)).toBeNull();
    expect(resolveProfileIconAssetPath(-1)).toBeNull();
  });
});
