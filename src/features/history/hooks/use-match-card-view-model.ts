import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { useLcuMapQuery } from "@/hooks/use-lcu-maps.ts";
import { useLcuQueueName } from "@/hooks/use-lcu-queues.ts";
import { formatStartTime } from "../components/match-card-display";
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
  | "mvp";

function computeMatchTags(
  me: RawMatchSummaryParticipant,
  participants: RawMatchSummaryParticipant[],
  isVictory: boolean,
): MatchTag[] {
  const tags: MatchTag[] = [];

  if ((me.pentaKills ?? 0) > 0) {
    tags.push("penta");
  } else if ((me.quadraKills ?? 0) > 0) {
    tags.push("quadra");
  } else if ((me.tripleKills ?? 0) > 0) {
    tags.push("triple");
  }

  if (me.firstBloodKill) {
    tags.push("firstBlood");
  }

  const allDamage = participants.map((p) => p.totalDamageDealtToChampions);
  if (
    me.totalDamageDealtToChampions > 0 &&
    me.totalDamageDealtToChampions >= Math.max(...allDamage)
  ) {
    tags.push("highestDamage");
  }

  if (isVictory) {
    const teammates = participants.filter((p) => p.teamId === me.teamId);
    const kda = (p: RawMatchSummaryParticipant) =>
      ((p.kills ?? 0) + (p.assists ?? 0)) / Math.max(1, p.deaths ?? 1);
    const myKda = kda(me);
    const isHighest = teammates.every((p) => kda(p) <= myKda);
    if (isHighest && myKda > 0) {
      tags.push("mvp");
    }
  }

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
