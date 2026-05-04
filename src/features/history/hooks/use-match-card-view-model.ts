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
  | "bestVision"
  | "mostCC"
  | "mostCS"
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
  highestDamage: 6,
  mostTurretDamage: 7,
  mostDamageTaken: 8,
  mostHealing: 9,
  bestVision: 10,
  mostCC: 11,
  mostCS: 12,
  highestKP: 13,
  mostGold: 14,
  bestDamageEfficiency: 15,
  firstBlood: 16,
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

const STAT_TAG_RULES: StatTagRule[] = [
  {
    tag: "mostTurretDamage",
    stat: (p) => p.damageDealtToBuildings ?? p.damageDealtToTurrets ?? 0,
    scope: "all",
  },
  { tag: "mostDamageTaken", stat: (p) => p.totalDamageTaken, scope: "team" },
  {
    tag: "mostHealing",
    stat: (p) => p.totalHealsOnTeammates + p.totalDamageShieldedOnTeammates,
    scope: "all",
    min: 5000,
  },
  { tag: "bestVision", stat: (p) => p.visionScore ?? 0, scope: "all" },
  { tag: "mostCC", stat: (p) => p.totalTimeCcDealt ?? 0, scope: "all" },
  {
    tag: "mostCS",
    stat: (p) => p.totalMinionsKilled + p.neutralMinionsKilled,
    scope: "all",
  },
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

function computeKda(p: RawMatchSummaryParticipant): number {
  return ((p.kills ?? 0) + (p.assists ?? 0)) / Math.max(1, p.deaths ?? 1);
}

function getTeamTag(
  me: RawMatchSummaryParticipant,
  teammates: RawMatchSummaryParticipant[],
  isVictory: boolean,
): MatchTag | null {
  const myKda = computeKda(me);
  if (myKda > 0 && teammates.every((p) => computeKda(p) <= myKda)) {
    return isVictory ? "mvp" : "ace";
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
  isVictory: boolean,
  damageRank: number,
): MatchPill[] {
  const pills: MatchPill[] = [];

  const teamTag = getTeamTag(me, teammates, isVictory);
  if (teamTag) pills.push({ type: "tag", tag: teamTag });
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
    gameResult === "victory",
    damageRank,
  );
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
    pills,
    roleQuestSlot: roleQuest.slot,
  };
}
