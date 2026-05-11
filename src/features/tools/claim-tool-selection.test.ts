import { describe, expect, test } from "bun:test";
import type {
  ClaimToolClaimablesDto,
  ClaimToolItemDto,
} from "@/bindings/claim_tool";
import {
  addHiddenClaimedIds,
  createEmptyClaimBucketIds,
  filterClaimablesByHiddenIds,
  pruneHiddenClaimedIds,
} from "./claim-tool-selection";

function claimableItem(id: string): ClaimToolItemDto {
  return {
    id,
    category: "reward",
    title: id,
    subtitle: null,
    iconUrl: null,
    quantity: null,
    choiceCount: 1,
    status: "claimable",
    reason: null,
    children: [],
  };
}

function claimables(rewardIds: string[]): ClaimToolClaimablesDto {
  return {
    rewards: rewardIds.map(claimableItem),
    missions: [],
    eventHub: [],
    refreshedAtMs: 100,
  };
}

describe("claim tool selection helpers", () => {
  test("hides successfully requested items while stale refresh still returns them", () => {
    const hiddenIds = addHiddenClaimedIds(
      createEmptyClaimBucketIds(),
      { rewards: ["reward-1"], missions: [], eventHub: [] },
      { claimed: 1, failed: 0 },
    );

    const visible = filterClaimablesByHiddenIds(
      claimables(["reward-1", "reward-2"]),
      hiddenIds,
    );

    expect(visible.rewards.map((item) => item.id)).toEqual(["reward-2"]);
  });

  test("releases hidden ids after refresh no longer returns them", () => {
    const hiddenIds = addHiddenClaimedIds(
      createEmptyClaimBucketIds(),
      { rewards: ["reward-1"], missions: [], eventHub: [] },
      { claimed: 1, failed: 0 },
    );

    const pruned = pruneHiddenClaimedIds(hiddenIds, claimables(["reward-2"]));

    expect(pruned.rewards.has("reward-1")).toBe(false);
  });

  test("keeps requested items visible when the claim run failed", () => {
    const hiddenIds = addHiddenClaimedIds(
      createEmptyClaimBucketIds(),
      { rewards: ["reward-1"], missions: [], eventHub: [] },
      { claimed: 0, failed: 1 },
    );

    const visible = filterClaimablesByHiddenIds(
      claimables(["reward-1"]),
      hiddenIds,
    );

    expect(visible.rewards.map((item) => item.id)).toEqual(["reward-1"]);
  });
});
