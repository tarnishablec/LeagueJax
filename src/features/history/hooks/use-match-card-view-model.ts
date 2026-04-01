import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { formatStartTime } from "@/features/history/components/match-card";
import { useLcuMapQuery } from "@/hooks/use-lcu-maps.ts";
import { useLcuQueueName } from "@/hooks/use-lcu-queues.ts";
import { useParticipantBrief } from "./use-participant-brief.ts";

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
  participants: RawMatchSummaryParticipant[],
): number {
  const teamTotal = participants
    .filter((p) => p.teamId === me.teamId)
    .reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0);
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

const TAG_PRIORITY: Record<MatchTag, number> = {
  mvp: 0,
  ace: 1,
  penta: 2,
  quadra: 3,
  triple: 4,
  highestDamage: 5,
  mostTurretDamage: 6,
  mostDamageTaken: 7,
  mostHealing: 8,
  bestVision: 9,
  mostCC: 10,
  mostCS: 11,
  highestKP: 12,
  mostGold: 13,
  bestDamageEfficiency: 14,
  firstBlood: 15,
};

type StatTagRule = {
  tag: MatchTag;
  stat: (p: RawMatchSummaryParticipant) => number;
  scope: "all" | "team";
  min?: number;
};

const STAT_TAG_RULES: StatTagRule[] = [
  {
    tag: "highestDamage",
    stat: (p) => p.totalDamageDealtToChampions,
    scope: "all",
  },
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

function computeMatchTags(
  me: RawMatchSummaryParticipant,
  participants: RawMatchSummaryParticipant[],
  isVictory: boolean,
): MatchTag[] {
  const teammates = participants.filter((p) => p.teamId === me.teamId);
  const tags: MatchTag[] = [];

  const multiKill = getMultiKillTag(me);
  if (multiKill) tags.push(multiKill);

  if (me.firstBloodKill) tags.push("firstBlood");

  tags.push(...collectStatTags(me, participants, teammates));

  const teamTag = getTeamTag(me, teammates, isVictory);
  if (teamTag) tags.push(teamTag);

  tags.sort((a, b) => TAG_PRIORITY[a] - TAG_PRIORITY[b]);
  return tags;
}

function normalizeHistoryPosition(
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
}: {
  me: RawMatchSummaryParticipant;
  match: RawMatchSummaryGame;
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

  const gameResult: MatchOutcome = endOfGameResult.startsWith("Abort_")
    ? "terminated"
    : outcome;

  const hasAugments =
    gameMode === "CHERRY" || gameMode === "KIWI" || gameMode === "STRAWBERRY";
  const supportsPosition = mapId === 11 || gameMode.toUpperCase() === "CLASSIC";

  const { primaryRuneId, subStyleId } = getPerkIds(me);
  const damageShare = computeDamageShare(me, participants);
  const position = supportsPosition
    ? (normalizeHistoryPosition(me.lane) ??
      normalizeHistoryPosition(me.individualPosition) ??
      normalizeHistoryPosition(me.teamPosition) ??
      "FILL")
    : null;
  const tags = computeMatchTags(me, participants, gameResult === "victory");

  return {
    me,
    gameId,
    gameDuration,
    participants,
    queueName: queueName ?? "",
    mapName: map?.name ?? "",
    startedAt,
    items,
    augments,
    gameResult,
    hasAugments,
    primaryRuneId,
    subStyleId,
    damageShare,
    position,
    tags,
  };
}
