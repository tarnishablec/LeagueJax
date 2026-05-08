import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches";
import {
  matchUsesSideTeams,
  type TeamTone,
  teamToneFromId,
} from "../../utils/match-participant-groups";

export function matchParticipantKey(
  participant: RawMatchSummaryParticipant,
  index: number,
): string {
  if (participant.participantId !== null) {
    return `participant-${participant.participantId}`;
  }

  return `participant-${participant.puuid ?? "unknown"}-${participant.championId}-${index}`;
}

export function matchParticipantDisplayName(
  participant: RawMatchSummaryParticipant,
): string {
  const names = [
    participant.riotIdGameName,
    participant.summonerName,
    participant.puuid,
  ];
  for (const name of names) {
    const normalizedName = (name ?? "").trim();
    if (normalizedName.length > 0) {
      return normalizedName;
    }
  }

  return "Unknown";
}

export function matchParticipantChampionName(
  participant: RawMatchSummaryParticipant,
): string {
  return participant.championName ?? `#${participant.championId}`;
}

export function matchParticipantTeamTone(
  participant: RawMatchSummaryParticipant,
  summary: RawMatchSummaryGame,
): TeamTone {
  if (!matchUsesSideTeams(summary)) {
    return "neutral";
  }

  return teamToneFromId(participant.teamId);
}
