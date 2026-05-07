import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { resolveMatchParticipantGroups } from "./match-participant-groups.ts";

export type MatchPerformanceBadge = "mvp" | "ace";
export type MatchPerformanceStrategy = "kda" | "balanced";

export const DEFAULT_MATCH_PERFORMANCE_STRATEGY: MatchPerformanceStrategy =
  "balanced";

export function isMatchPerformanceStrategy(
  value: unknown,
): value is MatchPerformanceStrategy {
  return value === "kda" || value === "balanced";
}

export function normalizeMatchPerformanceStrategy(
  value: unknown,
): MatchPerformanceStrategy {
  return isMatchPerformanceStrategy(value)
    ? value
    : DEFAULT_MATCH_PERFORMANCE_STRATEGY;
}

function computeKda(participant: RawMatchSummaryParticipant): number {
  return (
    ((participant.kills ?? 0) + (participant.assists ?? 0)) /
    Math.max(1, participant.deaths ?? 1)
  );
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function positiveRatio(value: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.max(0, value) / denominator;
}

function teamKillParticipation(
  participant: RawMatchSummaryParticipant,
  teamKills: number,
): number {
  const challengeValue = participant.challenges?.killParticipation;
  if (typeof challengeValue === "number" && Number.isFinite(challengeValue)) {
    return Math.max(0, challengeValue);
  }

  return positiveRatio(
    safeNumber(participant.kills) + safeNumber(participant.assists),
    teamKills,
  );
}

function computeCs(participant: RawMatchSummaryParticipant): number {
  return (
    safeNumber(participant.totalMinionsKilled) +
    safeNumber(participant.neutralMinionsKilled)
  );
}

function computeVision(participant: RawMatchSummaryParticipant): number {
  return Math.max(
    safeNumber(participant.visionScore),
    safeNumber(participant.challenges?.stealthWardsPlaced) +
      safeNumber(participant.challenges?.controlWardsPlaced),
  );
}

function computeUtility(participant: RawMatchSummaryParticipant): number {
  return (
    safeNumber(participant.totalHealsOnTeammates) +
    safeNumber(participant.totalDamageShieldedOnTeammates)
  );
}

function computeObjectiveContribution(
  participant: RawMatchSummaryParticipant,
): number {
  return (
    safeNumber(participant.damageDealtToObjectives) +
    safeNumber(participant.damageDealtToBuildings) +
    safeNumber(participant.damageDealtToTurrets) +
    safeNumber(participant.objectivesStolen) * 1500 +
    safeNumber(participant.challenges?.epicMonsterSteals) * 1500
  );
}

function computeBalancedScore(
  participant: RawMatchSummaryParticipant,
  teammates: RawMatchSummaryParticipant[],
): number {
  const teamKills = teammates.reduce(
    (sum, teammate) => sum + safeNumber(teammate.kills),
    0,
  );
  const maxChampionDamage = Math.max(
    ...teammates.map((teammate) =>
      safeNumber(teammate.totalDamageDealtToChampions),
    ),
    0,
  );
  const maxDamageTaken = Math.max(
    ...teammates.map((teammate) => safeNumber(teammate.totalDamageTaken)),
    0,
  );
  const maxMitigated = Math.max(
    ...teammates.map((teammate) => safeNumber(teammate.damageSelfMitigated)),
    0,
  );
  const maxGold = Math.max(
    ...teammates.map((teammate) => safeNumber(teammate.goldEarned)),
    0,
  );
  const maxCs = Math.max(...teammates.map(computeCs), 0);
  const maxVision = Math.max(...teammates.map(computeVision), 0);
  const maxUtility = Math.max(...teammates.map(computeUtility), 0);
  const maxCc = Math.max(
    ...teammates.map((teammate) => safeNumber(teammate.totalTimeCcDealt)),
    0,
  );
  const maxObjectiveContribution = Math.max(
    ...teammates.map(computeObjectiveContribution),
    0,
  );

  const kdaScore = Math.min(Math.sqrt(computeKda(participant)), 4) * 4;
  const participationScore = teamKillParticipation(participant, teamKills) * 20;
  const damageScore =
    positiveRatio(
      safeNumber(participant.totalDamageDealtToChampions),
      maxChampionDamage,
    ) *
      20 +
    safeNumber(participant.challenges?.teamDamagePercentage) * 15;
  const durabilityScore =
    positiveRatio(safeNumber(participant.totalDamageTaken), maxDamageTaken) *
      8 +
    positiveRatio(safeNumber(participant.damageSelfMitigated), maxMitigated) *
      8 +
    safeNumber(participant.challenges?.damageTakenOnTeamPercentage) * 8;
  const economyScore =
    positiveRatio(safeNumber(participant.goldEarned), maxGold) * 5;
  const csScore = positiveRatio(computeCs(participant), maxCs) * 4;
  const visionScore = positiveRatio(computeVision(participant), maxVision) * 10;
  const utilityScore =
    positiveRatio(computeUtility(participant), maxUtility) * 14;
  const controlScore =
    positiveRatio(safeNumber(participant.totalTimeCcDealt), maxCc) * 8;
  const objectiveScore =
    positiveRatio(
      computeObjectiveContribution(participant),
      maxObjectiveContribution,
    ) * 5;

  return (
    kdaScore +
    participationScore +
    damageScore +
    durabilityScore +
    economyScore +
    csScore +
    visionScore +
    utilityScore +
    controlScore +
    objectiveScore
  );
}

function compareBalancedPerformance(
  left: RawMatchSummaryParticipant,
  right: RawMatchSummaryParticipant,
  teammates: RawMatchSummaryParticipant[],
): number {
  const leftRank = [
    computeBalancedScore(left, teammates),
    teamKillParticipation(
      left,
      teammates.reduce((sum, teammate) => sum + safeNumber(teammate.kills), 0),
    ),
    safeNumber(left.totalDamageDealtToChampions),
    computeKda(left),
    -safeNumber(left.deaths),
    -safeNumber(left.participantId),
  ];
  const rightRank = [
    computeBalancedScore(right, teammates),
    teamKillParticipation(
      right,
      teammates.reduce((sum, teammate) => sum + safeNumber(teammate.kills), 0),
    ),
    safeNumber(right.totalDamageDealtToChampions),
    computeKda(right),
    -safeNumber(right.deaths),
    -safeNumber(right.participantId),
  ];

  for (let index = 0; index < leftRank.length; index++) {
    const diff = leftRank[index] - rightRank[index];
    if (Math.abs(diff) > Number.EPSILON) {
      return diff;
    }
  }

  return 0;
}

function isSameParticipant(
  left: RawMatchSummaryParticipant,
  right: RawMatchSummaryParticipant,
): boolean {
  if (left === right) {
    return true;
  }

  if (left.puuid && right.puuid && left.puuid === right.puuid) {
    return true;
  }

  return (
    left.participantId !== null &&
    right.participantId !== null &&
    left.participantId === right.participantId
  );
}

export function resolveMatchPerformanceBadge({
  me,
  teammates,
  isVictory,
  strategy = DEFAULT_MATCH_PERFORMANCE_STRATEGY,
}: {
  me: RawMatchSummaryParticipant;
  teammates: RawMatchSummaryParticipant[];
  isVictory: boolean;
  strategy?: MatchPerformanceStrategy;
}): MatchPerformanceBadge | null {
  if (strategy === "balanced") {
    const best = teammates.reduce<RawMatchSummaryParticipant | null>(
      (currentBest, participant) => {
        if (!currentBest) {
          return participant;
        }

        return compareBalancedPerformance(participant, currentBest, teammates) >
          0
          ? participant
          : currentBest;
      },
      null,
    );

    if (
      best &&
      isSameParticipant(best, me) &&
      computeBalancedScore(me, teammates) > 0
    ) {
      return isVictory ? "mvp" : "ace";
    }

    return null;
  }

  const myKda = computeKda(me);
  if (myKda > 0 && teammates.every((p) => computeKda(p) <= myKda)) {
    return isVictory ? "mvp" : "ace";
  }

  return null;
}

export function resolveMatchPerformanceBadgeForMatch(
  match: RawMatchSummaryGame,
  me: RawMatchSummaryParticipant,
  isVictory: boolean,
  strategy: MatchPerformanceStrategy = DEFAULT_MATCH_PERFORMANCE_STRATEGY,
): MatchPerformanceBadge | null {
  const groups = resolveMatchParticipantGroups(match);
  const meGroup =
    groups.find((group) =>
      group.participants.some((participant) =>
        isSameParticipant(participant, me),
      ),
    ) ?? null;

  return resolveMatchPerformanceBadge({
    me,
    teammates: meGroup?.participants ?? match.json.participants,
    isVictory,
    strategy,
  });
}
