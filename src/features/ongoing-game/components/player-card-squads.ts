import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";

export const DEFAULT_MIN_SHARED_SQUAD_GAMES = 2;

export type PlayerSquadAssignment = {
  color: string;
  evidenceGameIds: number[];
  memberPuuids: string[];
  number: number;
};

export type PlayerSquadAssignments = {
  byPuuid: Record<string, PlayerSquadAssignment>;
  squads: PlayerSquadAssignment[];
};

type TeamGroup = {
  teamId: number;
  members: PlayerSlot[];
};

type SquadCandidate = {
  evidenceGameIds: number[];
  firstMemberIndex: number;
  memberPuuids: string[];
};

type CurrentMember = {
  index: number;
  puuid: string;
};

function normalizePuuid(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const m = lightness - chroma / 2;
  const [r, g, b] =
    huePrime < 1
      ? [chroma, x, 0]
      : huePrime < 2
        ? [x, chroma, 0]
        : huePrime < 3
          ? [0, chroma, x]
          : huePrime < 4
            ? [0, x, chroma]
            : huePrime < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorForSquad(memberPuuids: readonly string[]): string {
  const seed = [...memberPuuids].sort().join("|");
  const hue = hashString(seed) % 360;
  return hslToHex(hue, 0.72, 0.62);
}

function participantTeamKey(
  participant: RawMatchSummaryParticipant | undefined,
): string | null {
  if (!participant) {
    return null;
  }

  if (
    typeof participant.playerSubteamId === "number" &&
    participant.playerSubteamId > 0
  ) {
    return `subteam:${participant.playerSubteamId}`;
  }

  if (typeof participant.teamId === "number" && participant.teamId > 0) {
    return `team:${participant.teamId}`;
  }

  return null;
}

function buildParticipantPuuidMap(
  game: RawMatchSummaryGame,
): Map<string, RawMatchSummaryParticipant> {
  const participants = new Map<string, RawMatchSummaryParticipant>();
  for (const participant of game.json.participants) {
    const puuid = normalizePuuid(participant.puuid);
    if (puuid.length > 0) {
      participants.set(puuid, participant);
    }
  }
  return participants;
}

function collectCurrentMembers(slots: PlayerSlot[]): CurrentMember[] {
  const seen = new Set<string>();
  const members: CurrentMember[] = [];

  for (const slot of slots) {
    const puuid = normalizePuuid(slot.puuid);
    if (puuid.length === 0 || seen.has(puuid)) {
      continue;
    }

    seen.add(puuid);
    members.push({
      index: members.length,
      puuid,
    });
  }

  return members;
}

function addPairEvidence(params: {
  gameId: number;
  pairEvidence: Map<string, Set<number>>;
  sourcePuuid: string;
  targetPuuid: string;
}): void {
  const key = pairKey(params.sourcePuuid, params.targetPuuid);
  const evidence = params.pairEvidence.get(key) ?? new Set<number>();
  evidence.add(params.gameId);
  params.pairEvidence.set(key, evidence);
}

function collectGamePairEvidence(params: {
  game: RawMatchSummaryGame;
  memberPuuids: Set<string>;
  pairEvidence: Map<string, Set<number>>;
  sourcePuuid: string;
}): void {
  const { game, memberPuuids, pairEvidence, sourcePuuid } = params;
  const participantMap = buildParticipantPuuidMap(game);
  const sourceTeamKey = participantTeamKey(participantMap.get(sourcePuuid));
  if (!sourceTeamKey) {
    return;
  }

  for (const [targetPuuid, targetParticipant] of participantMap) {
    if (targetPuuid === sourcePuuid || !memberPuuids.has(targetPuuid)) {
      continue;
    }

    if (participantTeamKey(targetParticipant) !== sourceTeamKey) {
      continue;
    }

    addPairEvidence({
      gameId: game.json.gameId,
      pairEvidence,
      sourcePuuid,
      targetPuuid,
    });
  }
}

function collectPairEvidence(params: {
  historiesByPuuid: Record<string, RawMatchSummaryGame[]>;
  matchHistoryCount: number;
  members: CurrentMember[];
}): Map<string, Set<number>> {
  const { historiesByPuuid, matchHistoryCount, members } = params;
  const memberPuuids = new Set(members.map((member) => member.puuid));
  const pairEvidence = new Map<string, Set<number>>();
  const limit = Math.max(0, matchHistoryCount);

  for (const member of members) {
    const games = historiesByPuuid[member.puuid]?.slice(0, limit) ?? [];

    for (const game of games) {
      collectGamePairEvidence({
        game,
        memberPuuids,
        pairEvidence,
        sourcePuuid: member.puuid,
      });
    }
  }

  return pairEvidence;
}

function normalizeMinSharedGames(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_MIN_SHARED_SQUAD_GAMES;
  }

  return Math.max(1, Math.floor(value));
}

function isEligiblePair(
  pairEvidence: Map<string, Set<number>>,
  left: string,
  right: string,
  minSharedGames: number,
): boolean {
  return (pairEvidence.get(pairKey(left, right))?.size ?? 0) >= minSharedGames;
}

function isClique(
  memberPuuids: string[],
  minSharedGames: number,
  pairEvidence: Map<string, Set<number>>,
): boolean {
  for (let i = 0; i < memberPuuids.length; i++) {
    for (let j = i + 1; j < memberPuuids.length; j++) {
      const left = memberPuuids[i];
      const right = memberPuuids[j];
      if (
        !left ||
        !right ||
        !isEligiblePair(pairEvidence, left, right, minSharedGames)
      ) {
        return false;
      }
    }
  }

  return true;
}

function collectCliqueEvidenceGameIds(
  memberPuuids: string[],
  pairEvidence: Map<string, Set<number>>,
): number[] {
  const evidenceGameIds = new Set<number>();

  for (let i = 0; i < memberPuuids.length; i++) {
    for (let j = i + 1; j < memberPuuids.length; j++) {
      const left = memberPuuids[i];
      const right = memberPuuids[j];
      if (!left || !right) {
        continue;
      }

      for (const gameId of pairEvidence.get(pairKey(left, right)) ?? []) {
        evidenceGameIds.add(gameId);
      }
    }
  }

  return [...evidenceGameIds].sort((left, right) => right - left);
}

function enumerateSquadCandidates(
  members: CurrentMember[],
  minSharedGames: number,
  pairEvidence: Map<string, Set<number>>,
): SquadCandidate[] {
  const candidates: SquadCandidate[] = [];
  const maskLimit = 1 << members.length;

  for (let mask = 1; mask < maskLimit; mask++) {
    const memberPuuids: string[] = [];
    const memberIndexes: number[] = [];

    for (let index = 0; index < members.length; index++) {
      if ((mask & (1 << index)) === 0) {
        continue;
      }

      const member = members[index];
      if (member) {
        memberPuuids.push(member.puuid);
        memberIndexes.push(member.index);
      }
    }

    if (
      memberPuuids.length < 2 ||
      !isClique(memberPuuids, minSharedGames, pairEvidence)
    ) {
      continue;
    }

    candidates.push({
      evidenceGameIds: collectCliqueEvidenceGameIds(memberPuuids, pairEvidence),
      firstMemberIndex: Math.min(...memberIndexes),
      memberPuuids,
    });
  }

  return candidates.sort((left, right) => {
    if (left.memberPuuids.length !== right.memberPuuids.length) {
      return right.memberPuuids.length - left.memberPuuids.length;
    }

    if (left.evidenceGameIds.length !== right.evidenceGameIds.length) {
      return right.evidenceGameIds.length - left.evidenceGameIds.length;
    }

    return left.firstMemberIndex - right.firstMemberIndex;
  });
}

function resolveTeamSquadCandidates(params: {
  historiesByPuuid: Record<string, RawMatchSummaryGame[]>;
  matchHistoryCount: number;
  minSharedGames: number;
  slots: PlayerSlot[];
}): SquadCandidate[] {
  const members = collectCurrentMembers(params.slots);
  if (members.length < 2) {
    return [];
  }

  const pairEvidence = collectPairEvidence({
    historiesByPuuid: params.historiesByPuuid,
    matchHistoryCount: params.matchHistoryCount,
    members,
  });
  const candidates = enumerateSquadCandidates(
    members,
    normalizeMinSharedGames(params.minSharedGames),
    pairEvidence,
  );
  const usedPuuids = new Set<string>();
  const selected: SquadCandidate[] = [];

  for (const candidate of candidates) {
    if (candidate.memberPuuids.some((puuid) => usedPuuids.has(puuid))) {
      continue;
    }

    selected.push(candidate);
    for (const puuid of candidate.memberPuuids) {
      usedPuuids.add(puuid);
    }
  }

  return selected.sort(
    (left, right) => left.firstMemberIndex - right.firstMemberIndex,
  );
}

export function resolvePlayerSquadAssignments(params: {
  historiesByPuuid: Record<string, RawMatchSummaryGame[]>;
  matchHistoryCount: number;
  minSharedGames: number;
  teamGroups: TeamGroup[];
}): PlayerSquadAssignments {
  const byPuuid: Record<string, PlayerSquadAssignment> = {};
  const squads: PlayerSquadAssignment[] = [];
  let nextSquadNumber = 1;

  for (const teamGroup of params.teamGroups) {
    const teamCandidates = resolveTeamSquadCandidates({
      historiesByPuuid: params.historiesByPuuid,
      matchHistoryCount: params.matchHistoryCount,
      minSharedGames: params.minSharedGames,
      slots: teamGroup.members,
    });

    for (const candidate of teamCandidates) {
      const assignment: PlayerSquadAssignment = {
        color: colorForSquad(candidate.memberPuuids),
        evidenceGameIds: candidate.evidenceGameIds,
        memberPuuids: candidate.memberPuuids,
        number: nextSquadNumber,
      };

      squads.push(assignment);
      for (const puuid of candidate.memberPuuids) {
        byPuuid[puuid] = assignment;
      }
      nextSquadNumber += 1;
    }
  }

  return { byPuuid, squads };
}
