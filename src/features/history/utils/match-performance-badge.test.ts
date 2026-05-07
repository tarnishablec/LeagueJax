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

  test("balanced strategy does not award MVP to a high-death volume game when a cleaner carry has comparable output", () => {
    const highDeathVolume = participant(1, {
      kills: 8,
      deaths: 19,
      assists: 41,
      totalDamageDealtToChampions: 64_709,
      totalDamageTaken: 63_509,
      damageSelfMitigated: 45_000,
      goldEarned: 18_200,
      totalMinionsKilled: 286,
      neutralMinionsKilled: 14,
      visionScore: 24,
      totalTimeCcDealt: 42,
      damageDealtToBuildings: 4_000,
      damageDealtToObjectives: 5_800,
      challenges: {
        killParticipation: 0.75,
        damageTakenOnTeamPercentage: 0.3,
        teamDamagePercentage: 0.216,
      } as RawMatchSummaryParticipant["challenges"],
    });
    const cleanerCarry = participant(2, {
      kills: 20,
      deaths: 6,
      assists: 18,
      totalDamageDealtToChampions: 76_446,
      totalDamageTaken: 27_730,
      damageSelfMitigated: 8_000,
      goldEarned: 19_000,
      totalMinionsKilled: 300,
      neutralMinionsKilled: 18,
      visionScore: 20,
      totalTimeCcDealt: 18,
      damageDealtToBuildings: 4_700,
      damageDealtToObjectives: 6_200,
      challenges: {
        killParticipation: 0.7,
        teamDamagePercentage: 0.255,
      } as RawMatchSummaryParticipant["challenges"],
    });
    const teammate1 = participant(3, {
      kills: 14,
      deaths: 12,
      assists: 22,
      totalDamageDealtToChampions: 49_917,
      totalDamageTaken: 72_946,
      damageSelfMitigated: 24_000,
      goldEarned: 16_400,
      totalMinionsKilled: 118,
      visionScore: 18,
    });
    const teammate2 = participant(4, {
      kills: 21,
      deaths: 8,
      assists: 30,
      totalDamageDealtToChampions: 67_764,
      totalDamageTaken: 36_985,
      damageSelfMitigated: 12_000,
      goldEarned: 18_600,
      totalMinionsKilled: 260,
      visionScore: 21,
    });
    const teammate3 = participant(5, {
      kills: 2,
      deaths: 30,
      assists: 33,
      totalDamageDealtToChampions: 40_268,
      totalDamageTaken: 113_496,
      damageSelfMitigated: 74_000,
      goldEarned: 13_000,
      totalMinionsKilled: 96,
      visionScore: 36,
      totalTimeCcDealt: 86,
    });
    const teammates = [
      highDeathVolume,
      cleanerCarry,
      teammate1,
      teammate2,
      teammate3,
    ];

    expect(
      resolveMatchPerformanceBadge({
        me: highDeathVolume,
        teammates,
        isVictory: true,
        strategy: "balanced",
      }),
    ).toBeNull();
    expect(
      resolveMatchPerformanceBadge({
        me: cleanerCarry,
        teammates,
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
