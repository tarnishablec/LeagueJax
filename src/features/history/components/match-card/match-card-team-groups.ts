import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";

export type TeamSide = "blue" | "red";
export type TeamTone = TeamSide | "neutral";

export type MatchParticipantGroup = {
  key: string;
  teamId: number | null;
  labelNumber: number;
  tone: TeamTone;
  participants: RawMatchSummaryParticipant[];
  showObjectives: boolean;
};

const BLUE_TEAM_ID = 100;
const RED_TEAM_ID = 200;
const TEAM_SORT_ORDER = new Map<number, number>([
  [BLUE_TEAM_ID, 0],
  [RED_TEAM_ID, 1],
]);

export function matchUsesSideTeams(summary: RawMatchSummaryGame): boolean {
  const gameMode = summary.json.gameMode.toUpperCase();
  return (
    summary.json.mapId === 11 ||
    summary.json.mapId === 12 ||
    summary.json.queueId === 450 ||
    gameMode === "CLASSIC"
  );
}

export function teamToneFromId(teamId: number | null | undefined): TeamTone {
  if (teamId === BLUE_TEAM_ID) {
    return "blue";
  }

  if (teamId === RED_TEAM_ID) {
    return "red";
  }

  return "neutral";
}

function compareTeamIds(a: number, b: number): number {
  return (
    (TEAM_SORT_ORDER.get(a) ?? a + 1000) - (TEAM_SORT_ORDER.get(b) ?? b + 1000)
  );
}

function validGroupId(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && value > 0 ? value : null;
}

function participantFallbackGroupId(
  participant: RawMatchSummaryParticipant,
  index: number,
): number {
  return (
    validGroupId(participant.teamId) ??
    validGroupId(participant.playerSubteamId) ??
    participant.participantId ??
    index + 1
  );
}

function matchHasSubteams(summary: RawMatchSummaryGame): boolean {
  const subteamIds = new Set(
    summary.json.participants
      .map((participant) => validGroupId(participant.playerSubteamId))
      .filter((subteamId): subteamId is number => subteamId !== null),
  );
  return subteamIds.size > 1;
}

function groupedParticipants(
  participants: RawMatchSummaryParticipant[],
  groupIdForParticipant: (
    participant: RawMatchSummaryParticipant,
    index: number,
  ) => number,
): Array<[number, RawMatchSummaryParticipant[]]> {
  const groups = new Map<number, RawMatchSummaryParticipant[]>();

  participants.forEach((participant, index) => {
    const groupId = groupIdForParticipant(participant, index);
    const group = groups.get(groupId);
    if (group) {
      group.push(participant);
    } else {
      groups.set(groupId, [participant]);
    }
  });

  return Array.from(groups.entries()).filter(
    ([, groupParticipants]) => groupParticipants.length > 0,
  );
}

export function resolveMatchParticipantGroups(
  summary: RawMatchSummaryGame,
): MatchParticipantGroup[] {
  if (matchUsesSideTeams(summary)) {
    return groupedParticipants(
      summary.json.participants,
      (participant, index) => participantFallbackGroupId(participant, index),
    )
      .sort(([a], [b]) => compareTeamIds(a, b))
      .map(([teamId, participants], index) => ({
        key: `team-${teamId}`,
        teamId,
        labelNumber: index + 1,
        tone: teamToneFromId(teamId),
        participants,
        showObjectives: true,
      }));
  }

  const useSubteams = matchHasSubteams(summary);

  return groupedParticipants(
    summary.json.participants,
    (participant, index) => {
      if (useSubteams) {
        return (
          validGroupId(participant.playerSubteamId) ??
          participantFallbackGroupId(participant, index)
        );
      }

      return participantFallbackGroupId(participant, index);
    },
  )
    .sort(([a], [b]) => a - b)
    .map(([groupId, participants], index) => ({
      key: `group-${groupId}`,
      teamId: null,
      labelNumber: index + 1,
      tone: "neutral",
      participants,
      showObjectives: false,
    }));
}
