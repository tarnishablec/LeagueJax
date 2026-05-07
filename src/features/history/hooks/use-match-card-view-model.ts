import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { formatStartTime } from "@/features/history/components/match-card";
import { useLcuMapQuery } from "@/hooks/use-lcu-maps.ts";
import { useLcuQueueName } from "@/hooks/use-lcu-queues.ts";
import {
  matchUsesSubteams,
  resolveMatchParticipantGroups,
} from "../utils/match-participant-groups.ts";
import { resolveMatchPerformanceBadge } from "../utils/match-performance-badge.ts";
import { useMatchPerformanceStrategy } from "./use-match-performance-strategy";
import { useParticipantBrief } from "./use-participant-brief.ts";
import { useRoleQuestSlot } from "./use-role-quest-slot.ts";

export type MatchOutcome = "victory" | "defeat" | "remake" | "terminated";

export const OUTCOME_LABEL_KEYS: Record<MatchOutcome, string> = {
  victory: "history.victory",
  defeat: "history.defeat",
  remake: "history.remake",
  terminated: "history.terminated",
};

function getPerkIds(me: RawMatchSummaryParticipant): {
  primaryRuneId: number;
  subStyleId: number;
} {
  const styles = me.perks?.styles;
  if (!styles || styles.length < 2) {
    return { primaryRuneId: 0, subStyleId: 0 };
  }
  const primary = styles.find((st) => st.description === "primaryStyle");
  const sub = styles.find((st) => st.description === "subStyle");
  return {
    primaryRuneId: primary?.selections?.[0]?.perk ?? 0,
    subStyleId: sub?.style ?? 0,
  };
}

function computeDamageShare(
  me: RawMatchSummaryParticipant,
  teammates: RawMatchSummaryParticipant[],
): number {
  const teamTotal = teammates.reduce(
    (sum, p) => sum + p.totalDamageDealtToChampions,
    0,
  );
  if (teamTotal === 0) return 0;
  return me.totalDamageDealtToChampions / teamTotal;
}

export type MatchTag =
  | "penta"
  | "quadra"
  | "triple"
  | "firstBlood"
  | "highestDamage"
  | "mostTurretDamage"
  | "mostDamageTaken"
  | "mostHealing"
  | "mostShielding"
  | "bestVision"
  | "mostWardsKilled"
  | "mostWardsPlaced"
  | "epicSteal"
  | "junglePressure"
  | "survivor"
  | "mostMitigated"
  | "mostCC"
  | "mostCS"
  | "mostAssists"
  | "highestKP"
  | "mostGold"
  | "bestDamageEfficiency"
  | "mvp"
  | "ace";

export type MatchPill =
  | { type: "tag"; tag: MatchTag }
  | { type: "soloKill"; count: number };

const TAG_PRIORITY: Record<MatchTag, number> = {
  mvp: 0,
  ace: 1,
  penta: 3,
  quadra: 4,
  triple: 5,
  epicSteal: 6,
  highestDamage: 7,
  mostTurretDamage: 8,
  mostDamageTaken: 9,
  mostMitigated: 10,
  mostHealing: 11,
  mostShielding: 12,
  bestVision: 13,
  mostWardsKilled: 14,
  mostWardsPlaced: 15,
  junglePressure: 16,
  survivor: 17,
  mostCC: 18,
  mostCS: 19,
  mostAssists: 20,
  highestKP: 21,
  mostGold: 22,
  bestDamageEfficiency: 23,
  firstBlood: 24,
};

function getPillPriority(pill: MatchPill): number {
  if (pill.type === "soloKill") return 2;
  return TAG_PRIORITY[pill.tag];
}

type StatTagRule = {
  tag: MatchTag;
  stat: (p: RawMatchSummaryParticipant) => number;
  scope: "all" | "team";
  min?: number;
};

function getWardsKilled(p: RawMatchSummaryParticipant): number {
  return p.wardsKilled ?? p.challenges?.wardTakedowns ?? 0;
}

function getWardsPlaced(p: RawMatchSummaryParticipant): number {
  const wardsPlaced = p.wardsPlaced ?? 0;
  const challengeWards =
    (p.challenges?.stealthWardsPlaced ?? 0) +
    (p.challenges?.controlWardsPlaced ?? 0);
  return Math.max(wardsPlaced, challengeWards);
}

function getJunglePressureScore(p: RawMatchSummaryParticipant): number {
  const enemyJungleKills = Math.max(
    p.totalEnemyJungleMinionsKilled ?? 0,
    p.challenges?.enemyJungleMonsterKills ?? 0,
  );
  const stolenBuffs = p.challenges?.buffsStolen ?? 0;
  return enemyJungleKills + stolenBuffs * 4;
}

function getSurvivalScore(p: RawMatchSummaryParticipant): number {
  const longestLife = p.longestTimeSpentLiving ?? 0;
  const clutchEscapes = p.challenges?.survivedSingleDigitHpCount ?? 0;
  const largeDamageSurvived = p.challenges?.tookLargeDamageSurvived ?? 0;
  const deaths = p.deaths ?? 0;
  return Math.max(
    0,
    longestLife +
      clutchEscapes * 180 +
      largeDamageSurvived * 120 -
      deaths * 120,
  );
}

const STAT_TAG_RULES: StatTagRule[] = [
  {
    tag: "mostTurretDamage",
    stat: (p) => p.damageDealtToBuildings ?? p.damageDealtToTurrets ?? 0,
    scope: "all",
  },
  { tag: "mostDamageTaken", stat: (p) => p.totalDamageTaken, scope: "team" },
  {
    tag: "mostMitigated",
    stat: (p) => p.damageSelfMitigated ?? 0,
    scope: "all",
    min: 5000,
  },
  {
    tag: "mostHealing",
    stat: (p) => p.totalHealsOnTeammates,
    scope: "all",
    min: 3000,
  },
  {
    tag: "mostShielding",
    stat: (p) => p.totalDamageShieldedOnTeammates,
    scope: "all",
    min: 1000,
  },
  { tag: "bestVision", stat: (p) => p.visionScore ?? 0, scope: "all" },
  { tag: "mostWardsKilled", stat: getWardsKilled, scope: "all" },
  { tag: "mostWardsPlaced", stat: getWardsPlaced, scope: "all" },
  { tag: "epicSteal", stat: (p) => p.objectivesStolen ?? 0, scope: "all" },
  {
    tag: "junglePressure",
    stat: getJunglePressureScore,
    scope: "all",
    min: 4,
  },
  { tag: "survivor", stat: getSurvivalScore, scope: "all", min: 600 },
  { tag: "mostCC", stat: (p) => p.totalTimeCcDealt ?? 0, scope: "all" },
  {
    tag: "mostCS",
    stat: (p) => p.totalMinionsKilled + p.neutralMinionsKilled,
    scope: "all",
  },
  { tag: "mostAssists", stat: (p) => p.assists ?? 0, scope: "all", min: 10 },
  {
    tag: "highestKP",
    stat: (p) => p.challenges?.killParticipation ?? 0,
    scope: "all",
  },
  { tag: "mostGold", stat: (p) => p.goldEarned ?? 0, scope: "all" },
  {
    tag: "bestDamageEfficiency",
    stat: (p) => {
      const gold = p.goldEarned ?? 0;
      if (gold === 0) return 0;
      return p.totalDamageDealtToChampions / gold;
    },
    scope: "all",
  },
];

const MULTI_KILL_TIERS: [keyof RawMatchSummaryParticipant, MatchTag][] = [
  ["pentaKills", "penta"],
  ["quadraKills", "quadra"],
  ["tripleKills", "triple"],
];

function getMultiKillTag(me: RawMatchSummaryParticipant): MatchTag | null {
  for (const [field, tag] of MULTI_KILL_TIERS) {
    if (((me[field] as number | null) ?? 0) > 0) return tag;
  }
  return null;
}

function collectStatTags(
  me: RawMatchSummaryParticipant,
  participants: RawMatchSummaryParticipant[],
  teammates: RawMatchSummaryParticipant[],
): MatchTag[] {
  const result: MatchTag[] = [];
  for (const rule of STAT_TAG_RULES) {
    const myValue = rule.stat(me);
    if (myValue <= 0) continue;
    if (rule.min && myValue < rule.min) continue;
    const group = rule.scope === "team" ? teammates : participants;
    if (group.every((p) => rule.stat(p) <= myValue)) {
      result.push(rule.tag);
    }
  }
  return result;
}

function computeMatchPills(
  me: RawMatchSummaryParticipant,
  participants: RawMatchSummaryParticipant[],
  teammates: RawMatchSummaryParticipant[],
  // isVictory: boolean,
  damageRank: number,
): MatchPill[] {
  const pills: MatchPill[] = [];

  // const teamTag = resolveMatchPerformanceBadge({ me, teammates, isVictory });
  // if (teamTag) pills.push({ type: "tag", tag: teamTag });
  if ((me.totalDamageDealtToChampions ?? 0) > 0 && damageRank === 1) {
    pills.push({ type: "tag", tag: "highestDamage" });
  }

  const soloKillCount = me.challenges?.soloKills ?? 0;
  if (soloKillCount > 0) {
    pills.push({ type: "soloKill", count: soloKillCount });
  }

  const multiKill = getMultiKillTag(me);
  if (multiKill) pills.push({ type: "tag", tag: multiKill });

  if (me.firstBloodKill) pills.push({ type: "tag", tag: "firstBlood" });

  pills.push(
    ...collectStatTags(me, participants, teammates).map((tag) => ({
      type: "tag" as const,
      tag,
    })),
  );

  pills.sort((a, b) => getPillPriority(a) - getPillPriority(b));
  return pills;
}

export function normalizeHistoryPosition(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized || normalized === "INVALID") {
    return null;
  }
  if (normalized === "NONE") {
    return null;
  }

  if (normalized === "AFK") {
    return null;
  }

  return normalized;
}

export function useMatchCardViewModel({
  match,
  me,
  resolvedJungleEggItemId,
}: {
  me: RawMatchSummaryParticipant;
  match: RawMatchSummaryGame;
  resolvedJungleEggItemId?: number | null;
}) {
  const {
    mapId,
    queueId,
    gameModeMutators,
    gameMode,
    gameCreation,
    endOfGameResult,
    gameDuration,
    gameId,
    participants,
  } = match.json;

  const { data: map } = useLcuMapQuery(mapId, gameModeMutators, gameMode);
  const queueName = useLcuQueueName(queueId);
  const performanceStrategy = useMatchPerformanceStrategy();
  const startedAt = formatStartTime(gameCreation);
  const { items, augments, outcome } = useParticipantBrief(me);
  const roleQuest = useRoleQuestSlot({
    participant: me,
    match,
    resolvedJungleEggItemId,
  });

  const gameResult: MatchOutcome = endOfGameResult.startsWith("Abort_")
    ? "terminated"
    : outcome;

  const hasAugments = gameMode === "CHERRY" || gameMode === "KIWI";
  const supportsPosition = mapId === 11 || gameMode.toUpperCase() === "CLASSIC";
  const participantGroups = resolveMatchParticipantGroups(match);
  const meGroup =
    participantGroups.find((group) => group.participants.includes(me)) ?? null;
  const teammates = meGroup?.participants ?? participants;
  const isSubteamMatch = matchUsesSubteams(match);

  const { primaryRuneId, subStyleId } = getPerkIds(me);
  const damageShare = computeDamageShare(me, teammates);
  const fallbackPosition = supportsPosition
    ? (normalizeHistoryPosition(me.teamPosition) ??
      normalizeHistoryPosition(me.individualPosition) ??
      normalizeHistoryPosition(me.lane) ??
      "FILL")
    : null;

  // console.log("inferredPosition", roleQuest.inferredPosition);

  const position = roleQuest.inferredPosition ?? fallbackPosition;
  const myDamage = me.totalDamageDealtToChampions ?? 0;
  const damageRank =
    participants.filter((p) => (p.totalDamageDealtToChampions ?? 0) > myDamage)
      .length + 1;
  const pills = computeMatchPills(
    me,
    participants,
    teammates,
    // gameResult === "victory",
    damageRank,
  );
  const performanceBadge = resolveMatchPerformanceBadge({
    me,
    teammates,
    isVictory: gameResult === "victory",
    strategy: performanceStrategy,
  });
  const myGold = me.goldEarned ?? 0;
  const goldRank =
    participants.filter((p) => (p.goldEarned ?? 0) > myGold).length + 1;

  return {
    me,
    gameId,
    gameDuration,
    participants,
    participantGroups,
    meGroup,
    queueName: queueName ?? "",
    mapName: map?.name ?? "",
    startedAt,
    items,
    augments,
    gameResult,
    isSubteamMatch,
    placement: meGroup?.placement ?? null,
    hasAugments,
    primaryRuneId,
    subStyleId,
    damageShare,
    damageRank,
    goldRank,
    position,
    performanceBadge,
    pills,
    roleQuestSlot: roleQuest.slot,
  };
}
