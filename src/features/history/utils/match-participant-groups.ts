import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";

export type TeamSide = "blue" | "red";
export type TeamTone = TeamSide | "neutral";

export type MatchParticipantGroup = {
  key: string;
  teamId: number | null;
  groupId: number;
  labelNumber: number;
  nameKey: string | null;
  placement: number | null;
  accentColor: string;
  layout: "side" | "subteam";
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
const ARENA_TEAM_NAME_KEYS = [
  "krugs",
  "poros",
  "raptors",
  "wolves",
  "gromps",
  "scuttlers",
  "minions",
  "sentinels",
] as const;
const ARENA_TEAM_COLORS = [
  "oklch(0.72 0.16 35)",
  "oklch(0.72 0.13 78)",
  "oklch(0.74 0.14 145)",
  "oklch(0.72 0.12 205)",
  "oklch(0.74 0.15 252)",
  "oklch(0.75 0.14 292)",
  "oklch(0.73 0.16 330)",
  "oklch(0.78 0.1 105)",
] as const;

export function matchUsesSubteams(summary: RawMatchSummaryGame): boolean {
  return !matchUsesSideTeams(summary) && matchHasSubteams(summary);
}

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

function safePlacement(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && value > 0 ? value : null;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function arenaNameIndex(
  groupId: number,
  participants: RawMatchSummaryParticipant[],
): number {
  const participantSeed = participants
    .map((participant) => participant.puuid ?? `${participant.championId}`)
    .sort()
    .join("|");
  return (
    hashString(`${groupId}:${participantSeed}`) % ARENA_TEAM_NAME_KEYS.length
  );
}

function arenaPlacement(
  groupId: number,
  participants: RawMatchSummaryParticipant[],
): number | null {
  const placements = participants
    .map((participant) => safePlacement(participant.subteamPlacement))
    .filter((placement): placement is number => placement !== null);
  if (placements.length > 0) {
    return Math.min(...placements);
  }

  const fallbackPlacements = participants
    .map((participant) => safePlacement(participant.placement))
    .filter((placement): placement is number => placement !== null);
  if (fallbackPlacements.length > 0) {
    return Math.min(...fallbackPlacements);
  }

  return groupId;
}

function arenaTeamMetadata(
  groupId: number,
  participants: RawMatchSummaryParticipant[],
  usedNameIndexes: Set<number>,
): {
  accentColor: string;
  nameKey: string;
  placement: number | null;
} {
  const preferredIndex = arenaNameIndex(groupId, participants);
  let index = preferredIndex;
  for (let offset = 0; offset < ARENA_TEAM_NAME_KEYS.length; offset++) {
    const candidate = (preferredIndex + offset) % ARENA_TEAM_NAME_KEYS.length;
    if (!usedNameIndexes.has(candidate)) {
      index = candidate;
      break;
    }
  }
  usedNameIndexes.add(index);

  return {
    accentColor: ARENA_TEAM_COLORS[index],
    nameKey: `history.matchDetails.arenaTeams.${ARENA_TEAM_NAME_KEYS[index]}`,
    placement: arenaPlacement(groupId, participants),
  };
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
      .map(
        ([teamId, participants], index) =>
          ({
            key: `team-${teamId}`,
            teamId,
            groupId: teamId,
            labelNumber: index + 1,
            nameKey: null,
            placement: null,
            accentColor:
              teamToneFromId(teamId) === "red"
                ? "oklch(0.68 0.18 26)"
                : "oklch(0.7 0.15 240)",
            layout: "side",
            tone: teamToneFromId(teamId),
            participants,
            showObjectives: true,
          }) satisfies MatchParticipantGroup,
      );
  }

  const useSubteams = matchHasSubteams(summary);
  const usedArenaNameIndexes = new Set<number>();

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
    .map(([groupId, participants], index) => {
      const metadata = arenaTeamMetadata(
        groupId,
        participants,
        usedArenaNameIndexes,
      );
      return {
        key: `group-${groupId}`,
        teamId: null,
        groupId,
        labelNumber: index + 1,
        nameKey: metadata.nameKey,
        placement: metadata.placement,
        accentColor: metadata.accentColor,
        layout: "subteam",
        tone: "neutral",
        participants,
        showObjectives: false,
      } satisfies MatchParticipantGroup;
    })
    .sort((left, right) => {
      const leftPlacement = left.placement ?? Number.MAX_SAFE_INTEGER;
      const rightPlacement = right.placement ?? Number.MAX_SAFE_INTEGER;
      if (leftPlacement !== rightPlacement) {
        return leftPlacement - rightPlacement;
      }

      const nameCompare = (left.nameKey ?? "").localeCompare(
        right.nameKey ?? "",
      );
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return left.groupId - right.groupId;
    });
}
