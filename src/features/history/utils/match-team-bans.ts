import type { RawMatchSummaryTeam } from "@/bindings/matches";
import type { MatchParticipantGroup } from "./match-participant-groups";

export const EMPTY_BAN_CHAMPION_ID = -1;

export type MatchTeamBanSlot = {
  championId: number;
  pickTurn: number | null;
  key: string;
};

function normalizeBanChampionId(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return EMPTY_BAN_CHAMPION_ID;
}

function normalizePickTurn(value: number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return null;
}

function compareBanSlots(
  left: MatchTeamBanSlot,
  right: MatchTeamBanSlot,
): number {
  const leftTurn = left.pickTurn ?? Number.MAX_SAFE_INTEGER;
  const rightTurn = right.pickTurn ?? Number.MAX_SAFE_INTEGER;

  if (leftTurn !== rightTurn) {
    return leftTurn - rightTurn;
  }

  return left.key.localeCompare(right.key);
}

export function resolveMatchTeamBanSlots(
  team: RawMatchSummaryTeam | undefined,
): MatchTeamBanSlot[] {
  return (team?.bans ?? [])
    .map((ban, index) => {
      const championId = normalizeBanChampionId(ban.championId);
      const pickTurn = normalizePickTurn(ban.pickTurn);

      return {
        championId,
        pickTurn,
        key: `ban-${pickTurn ?? "none"}-${championId}-${index}`,
      } satisfies MatchTeamBanSlot;
    })
    .sort(compareBanSlots);
}

export function resolveMatchTeamForGroup(
  teams: RawMatchSummaryTeam[],
  group: MatchParticipantGroup,
): RawMatchSummaryTeam | undefined {
  if (group.teamId !== null) {
    const sideTeam = teams.find((team) => team.teamId === group.teamId);
    if (sideTeam) {
      return sideTeam;
    }
  }

  if (group.layout === "subteam") {
    return teams.find((team) => team.teamId === group.groupId);
  }

  return undefined;
}
