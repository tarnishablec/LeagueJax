import { describe, expect, test } from "bun:test";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches";
import {
  resolveMatchPerformanceBadge,
  resolveMatchPerformanceBadgeForMatch,
} from "./match-performance-badge";

function participant(
  id: number,
  overrides: Partial<RawMatchSummaryParticipant>,
): RawMatchSummaryParticipant {
  return {
    participantId: id,
    puuid: `puuid-${id}`,
    teamId: 100,
    championId: id,
    kills: 0,
    deaths: 0,
    assists: 0,
    totalDamageDealtToChampions: 0,
    totalDamageTaken: 0,
    damageSelfMitigated: 0,
    goldEarned: 0,
    totalMinionsKilled: 0,
    neutralMinionsKilled: 0,
    visionScore: 0,
    totalHealsOnTeammates: 0,
    totalDamageShieldedOnTeammates: 0,
    totalTimeCcDealt: 0,
    damageDealtToBuildings: 0,
    damageDealtToObjectives: 0,
    damageDealtToTurrets: 0,
    objectivesStolen: 0,
    challenges: null,
    ...overrides,
  } as RawMatchSummaryParticipant;
}

function match(
  participants: RawMatchSummaryParticipant[],
): RawMatchSummaryGame {
  return {
    json: {
      participants,
      teams: [],
      mapId: 11,
      queueId: 420,
      gameMode: "CLASSIC",
      gameModeMutators: [],
      endOfGameResult: "GameComplete",
    },
  } as unknown as RawMatchSummaryGame;
}

describe("resolveMatchPerformanceBadge", () => {
  test("keeps kda strategy compatible with the existing highest KDA rule", () => {
    const me = participant(1, { kills: 3, deaths: 0, assists: 8 });
    const teammate = participant(2, { kills: 12, deaths: 2, assists: 5 });

    expect(
      resolveMatchPerformanceBadge({
        me,
        teammates: [me, teammate],
        isVictory: true,
        strategy: "kda",
      }),
    ).toBe("mvp");
  });

  test("balanced strategy can award MVP to a lower-KDA support with higher team contribution", () => {
    const support = participant(1, {
      kills: 1,
      deaths: 5,
      assists: 23,
      totalDamageDealtToChampions: 10_000,
      totalDamageTaken: 24_000,
      damageSelfMitigated: 18_000,
      goldEarned: 10_200,
      totalMinionsKilled: 32,
      neutralMinionsKilled: 0,
      visionScore: 86,
      totalHealsOnTeammates: 7_200,
      totalDamageShieldedOnTeammates: 5_400,
      totalTimeCcDealt: 72,
      damageDealtToBuildings: 1_400,
      damageDealtToObjectives: 2_500,
      challenges: {
        killParticipation: 0.86,
        controlWardsPlaced: 8,
        stealthWardsPlaced: 28,
        teamDamagePercentage: 0.18,
      } as RawMatchSummaryParticipant["challenges"],
    });
    const carry = participant(2, {
      kills: 13,
      deaths: 2,
      assists: 5,
      totalDamageDealtToChampions: 33_000,
      totalDamageTaken: 12_000,
      damageSelfMitigated: 4_000,
      goldEarned: 16_400,
      totalMinionsKilled: 236,
      neutralMinionsKilled: 12,
      visionScore: 18,
      totalTimeCcDealt: 14,
      damageDealtToBuildings: 2_600,
      damageDealtToObjectives: 1_200,
      challenges: {
        killParticipation: 0.64,
        teamDamagePercentage: 0.55,
      } as RawMatchSummaryParticipant["challenges"],
    });

    expect(
      resolveMatchPerformanceBadge({
        me: support,
        teammates: [support, carry],
        isVictory: true,
        strategy: "balanced",
      }),
    ).toBe("mvp");
  });

  test("match-level resolver applies the requested strategy", () => {
    const tank = participant(1, {
      kills: 3,
      deaths: 7,
      assists: 19,
      totalDamageDealtToChampions: 18_000,
      totalDamageTaken: 46_000,
      damageSelfMitigated: 52_000,
      goldEarned: 12_000,
      totalMinionsKilled: 171,
      neutralMinionsKilled: 4,
      visionScore: 39,
      totalTimeCcDealt: 91,
      damageDealtToBuildings: 2_000,
      damageDealtToObjectives: 3_100,
      challenges: {
        killParticipation: 0.79,
        damageTakenOnTeamPercentage: 0.43,
        teamDamagePercentage: 0.24,
      } as RawMatchSummaryParticipant["challenges"],
    });
    const carry = participant(2, {
      kills: 14,
      deaths: 3,
      assists: 3,
      totalDamageDealtToChampions: 31_000,
      totalDamageTaken: 15_000,
      damageSelfMitigated: 4_200,
      goldEarned: 15_800,
      totalMinionsKilled: 224,
      neutralMinionsKilled: 8,
      visionScore: 20,
      totalTimeCcDealt: 12,
      challenges: {
        killParticipation: 0.61,
        teamDamagePercentage: 0.42,
      } as RawMatchSummaryParticipant["challenges"],
    });

    expect(
      resolveMatchPerformanceBadgeForMatch(
        match([tank, carry]),
        tank,
        false,
        "balanced",
      ),
    ).toBe("ace");
  });
});
