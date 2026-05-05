import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { resolveMatchParticipantGroups } from "./match-participant-groups.ts";

export type MatchPerformanceBadge = "mvp" | "ace";

function computeKda(participant: RawMatchSummaryParticipant): number {
  return (
    ((participant.kills ?? 0) + (participant.assists ?? 0)) /
    Math.max(1, participant.deaths ?? 1)
  );
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
}: {
  me: RawMatchSummaryParticipant;
  teammates: RawMatchSummaryParticipant[];
  isVictory: boolean;
}): MatchPerformanceBadge | null {
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
): MatchPerformanceBadge | null {
  const groups = resolveMatchParticipantGroups(match);
  const meGroup =
    groups.find((group) =>
      group.participants.some((participant) => isSameParticipant(participant, me)),
    ) ?? null;

  return resolveMatchPerformanceBadge({
    me,
    teammates: meGroup?.participants ?? match.json.participants,
    isVictory,
  });
}
