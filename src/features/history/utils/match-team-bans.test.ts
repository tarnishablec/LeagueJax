import { describe, expect, test } from "bun:test";
import type { RawMatchSummaryTeam } from "@/bindings/matches";
import type { MatchParticipantGroup } from "./match-participant-groups";
import {
  EMPTY_BAN_CHAMPION_ID,
  resolveMatchTeamBanSlots,
  resolveMatchTeamForGroup,
} from "./match-team-bans";

function team(
  teamId: number | null,
  bans: RawMatchSummaryTeam["bans"],
): RawMatchSummaryTeam {
  return {
    teamId,
    bans,
    feats: null,
    objectives: null,
    win: null,
  };
}

function group(
  layout: MatchParticipantGroup["layout"],
  teamId: number | null,
  groupId: number,
): MatchParticipantGroup {
  return {
    key: `group-${groupId}`,
    teamId,
    groupId,
    labelNumber: 1,
    nameKey: null,
    placement: null,
    accentColor: "oklch(0.7 0.15 240)",
    layout,
    tone: "neutral",
    participants: [],
    showObjectives: false,
  };
}

describe("resolveMatchTeamBanSlots", () => {
  test("keeps empty bans as the empty champion icon slot", () => {
    const slots = resolveMatchTeamBanSlots(
      team(100, [
        { championId: 11, pickTurn: 2 },
        { championId: null, pickTurn: 1 },
        { championId: 0, pickTurn: 3 },
      ]),
    );

    expect(slots.map((slot) => slot.championId)).toEqual([
      EMPTY_BAN_CHAMPION_ID,
      11,
      EMPTY_BAN_CHAMPION_ID,
    ]);
  });

  test("returns no slots when a team has no bans", () => {
    expect(resolveMatchTeamBanSlots(team(100, []))).toEqual([]);
    expect(resolveMatchTeamBanSlots(undefined)).toEqual([]);
  });
});

describe("resolveMatchTeamForGroup", () => {
  test("uses side team ids for classic side teams", () => {
    const blueTeam = team(100, [{ championId: 11, pickTurn: 1 }]);
    const redTeam = team(200, [{ championId: 22, pickTurn: 1 }]);

    expect(
      resolveMatchTeamForGroup([redTeam, blueTeam], group("side", 100, 100)),
    ).toBe(blueTeam);
  });

  test("falls back to group id for arena subteams", () => {
    const arenaTeam = team(3, [{ championId: 11, pickTurn: 1 }]);

    expect(
      resolveMatchTeamForGroup([arenaTeam], group("subteam", null, 3)),
    ).toBe(arenaTeam);
  });
});
