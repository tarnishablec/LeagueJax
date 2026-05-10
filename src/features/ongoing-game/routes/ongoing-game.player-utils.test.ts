import { describe, expect, test } from "bun:test";
import {
  resolveOngoingTeamGroups,
  resolveOwnOngoingTeamSide,
  shouldRenderSlot,
} from "./ongoing-game.player-utils";
import type { PlayerSlot } from "./ongoing-game.types";

function playerSlot(index: number): PlayerSlot {
  return {
    puuid: `player-${index}`,
    summonerId: index,
    team: 100,
  } as PlayerSlot;
}

function playerSlotOnTeam(
  index: number,
  team: number,
  extra: Partial<PlayerSlot> = {},
): PlayerSlot {
  return {
    ...playerSlot(index),
    team,
    ...extra,
  };
}

function slotKind(kind: "player" | "bot" | "placeholder"): PlayerSlot {
  return {
    puuid: "",
    summonerId: 0,
    team: 1,
    slotKind: kind,
  } as PlayerSlot;
}

describe("resolveOngoingTeamGroups", () => {
  test("does not infer arena two-player groups in the frontend", () => {
    const groups = resolveOngoingTeamGroups({
      phase: "InGame",
      teamMembers: Array.from({ length: 16 }, (_, index) =>
        playerSlot(index + 1),
      ),
      gameflowSession: null,
      champSelectSession: null,
      effectiveQueueId: 1700,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.members).toHaveLength(16);
  });

  test("uses backend-provided arena team ids", () => {
    const teamMembers = Array.from({ length: 16 }, (_, index) => ({
      ...playerSlot(index + 1),
      team: 1001 + Math.floor(index / 2),
    }));
    const groups = resolveOngoingTeamGroups({
      phase: "InGame",
      teamMembers,
      gameflowSession: null,
      champSelectSession: null,
      effectiveQueueId: 1700,
    });

    expect(groups).toHaveLength(8);
    expect(groups.every((group) => group.members.length === 2)).toBe(true);
  });

  test("keeps two-player arena champ-select ally roster as one group", () => {
    const groups = resolveOngoingTeamGroups({
      phase: "ChampSelect",
      teamMembers: [playerSlot(1), playerSlot(2)],
      gameflowSession: null,
      champSelectSession: null,
      effectiveQueueId: 1700,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.members).toHaveLength(2);
  });
});

describe("resolveOwnOngoingTeamSide", () => {
  test("resolves blue side from the current player puuid", () => {
    expect(
      resolveOwnOngoingTeamSide({
        phase: "InGame",
        teamMembers: [playerSlotOnTeam(1, 100), playerSlotOnTeam(2, 200)],
        gameflowSession: null,
        champSelectSession: null,
        effectiveQueueId: 420,
        ownPuuid: "player-1",
      }),
    ).toBe("blue");
  });

  test("resolves red side from the current player puuid", () => {
    expect(
      resolveOwnOngoingTeamSide({
        phase: "InGame",
        teamMembers: [playerSlotOnTeam(1, 100), playerSlotOnTeam(2, 200)],
        gameflowSession: null,
        champSelectSession: null,
        effectiveQueueId: 420,
        ownPuuid: "player-2",
      }),
    ).toBe("red");
  });

  test("does not return a side for multi-team queues", () => {
    expect(
      resolveOwnOngoingTeamSide({
        phase: "InGame",
        teamMembers: [playerSlotOnTeam(1, 100), playerSlotOnTeam(2, 200)],
        gameflowSession: null,
        champSelectSession: null,
        effectiveQueueId: 1700,
        ownPuuid: "player-1",
      }),
    ).toBeNull();
  });

  test("resolves a side for Hextech ARAM queues", () => {
    expect(
      resolveOwnOngoingTeamSide({
        phase: "InGame",
        teamMembers: [playerSlotOnTeam(1, 100), playerSlotOnTeam(2, 200)],
        gameflowSession: null,
        champSelectSession: null,
        effectiveQueueId: 3140,
        ownPuuid: "player-1",
      }),
    ).toBe("blue");
  });

  test("falls back to champ-select local player cell id when puuid is hidden", () => {
    expect(
      resolveOwnOngoingTeamSide({
        phase: "ChampSelect",
        teamMembers: [
          playerSlotOnTeam(1, 1, { cellId: 7, puuid: "" }),
          playerSlotOnTeam(2, 2, { cellId: 8, puuid: "" }),
        ],
        gameflowSession: null,
        champSelectSession: {
          queueId: 420,
          localPlayerCellId: 8,
        } as never,
        effectiveQueueId: 420,
        ownPuuid: null,
      }),
    ).toBe("red");
  });
});

describe("shouldRenderSlot", () => {
  test("always renders real player slots", () => {
    expect(shouldRenderSlot(slotKind("player"), false)).toBe(true);
    expect(shouldRenderSlot(slotKind("player"), true)).toBe(true);
  });

  test("renders bot slots only when bots are enabled", () => {
    expect(shouldRenderSlot(slotKind("bot"), false)).toBe(false);
    expect(shouldRenderSlot(slotKind("bot"), true)).toBe(true);
  });

  test("never renders placeholder slots", () => {
    expect(shouldRenderSlot(slotKind("placeholder"), false)).toBe(false);
    expect(shouldRenderSlot(slotKind("placeholder"), true)).toBe(false);
  });
});
