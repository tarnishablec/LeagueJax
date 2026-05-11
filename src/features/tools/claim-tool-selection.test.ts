import { describe, expect, test } from "bun:test";
import type {
  ClaimToolClaimablesDto,
  ClaimToolItemDto,
} from "@/bindings/claim_tool";
import {
  addHiddenClaimedIds,
  applyBucketSelection,
  bucketHasClaimableItems,
  bucketSelectionCheckedState,
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

function skippedItem(id: string): ClaimToolItemDto {
  return {
    ...claimableItem(id),
    status: "skipped",
    reason: "Multiple choices",
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

  test("reports bucket checkbox state from claimable item selection", () => {
    const items = [
      claimableItem("reward-1"),
      claimableItem("reward-2"),
      skippedItem("reward-skipped"),
    ];

    expect(bucketHasClaimableItems(items)).toBe(true);
    expect(bucketSelectionCheckedState(items, new Set())).toBe(false);
    expect(bucketSelectionCheckedState(items, new Set(["reward-1"]))).toBe(
      "indeterminate",
    );
    expect(
      bucketSelectionCheckedState(items, new Set(["reward-1", "reward-2"])),
    ).toBe(true);
    expect(bucketHasClaimableItems([skippedItem("reward-skipped")])).toBe(
      false,
    );
  });

  test("selects and clears only claimable ids in the target bucket", () => {
    const selection = createEmptyClaimBucketIds();
    selection.missions.add("mission-1");

    const selected = applyBucketSelection(
      selection,
      "rewards",
      [claimableItem("reward-1"), skippedItem("reward-skipped")],
      true,
    );

    expect([...selected.rewards]).toEqual(["reward-1"]);
    expect([...selected.missions]).toEqual(["mission-1"]);

    const cleared = applyBucketSelection(
      selected,
      "rewards",
      [claimableItem("reward-1"), skippedItem("reward-skipped")],
      false,
    );

    expect([...cleared.rewards]).toEqual([]);
    expect([...cleared.missions]).toEqual(["mission-1"]);
  });
});
