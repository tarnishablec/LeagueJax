import type { RankStats } from "@/bindings/rank";
import type { SummonerInfo } from "@/bindings/summoner";
import type { PlayerSlot } from "./ongoing-game.types";

export function isBotPuuid(rawPuuid: string): boolean {
  const puuid = rawPuuid.trim().toUpperCase();
  return !puuid || puuid === "BOT" || puuid.startsWith("BOT_");
}

export function isBotSlot(slot: PlayerSlot): boolean {
  const hasHumanIdentity =
    slot.summonerId > 0 ||
    (slot.gameName ?? "").trim().length > 0 ||
    (slot.tagLine ?? "").trim().length > 0;

  if (hasHumanIdentity) {
    return false;
  }

  return isBotPuuid(slot.puuid);
}

export function formatSlotName(
  slot: PlayerSlot,
  summoner: SummonerInfo | undefined,
): string {
  const resolvedGameName =
    summoner?.gameName?.trim() || slot.gameName?.trim() || "";
  const resolvedTagLine =
    summoner?.tagLine?.trim() || slot.tagLine?.trim() || "";

  if (resolvedGameName && resolvedTagLine) {
    return `${resolvedGameName}#${resolvedTagLine}`;
  }

  if (resolvedGameName) {
    return resolvedGameName;
  }

  const fallbackName = summoner?.name?.trim() || slot.playerAlias?.trim() || "";
  if (fallbackName) {
    return fallbackName;
  }

  return isBotSlot(slot) ? "BOT" : "Unknown Summoner";
}

export function formatRank(stats: RankStats | undefined): string {
  const entry = stats?.highestRankedEntrySr ?? stats?.highestRankedEntry;

  if (!entry || !entry.tier || entry.tier === "NONE") {
    return "";
  }

  if (entry.division === "NA") {
    return `${entry.tier} ${entry.leaguePoints}LP`;
  }

  return `${entry.tier} ${entry.division} ${entry.leaguePoints}LP`;
}

export function groupTeamMembers(teamMembers: PlayerSlot[]): Array<{
  teamId: number;
  members: PlayerSlot[];
}> {
  const groups = new Map<number, PlayerSlot[]>();

  for (const member of teamMembers) {
    const teamId = member.team ?? -1;
    const group = groups.get(teamId);
    if (group) {
      group.push(member);
      continue;
    }

    groups.set(teamId, [member]);
  }

  return Array.from(groups.entries())
    .map(([teamId, members]) => ({
      teamId,
      members,
    }))
    .sort((left, right) => compareTeamIds(left.teamId, right.teamId));
}

function compareTeamIds(left: number, right: number): number {
  if (left === right) {
    return 0;
  }

  if (left === 100) {
    return -1;
  }

  if (right === 100) {
    return 1;
  }

  if (left === 200) {
    return right === 100 ? 1 : -1;
  }

  if (right === 200) {
    return left === 100 ? -1 : 1;
  }

  return left - right;
}

export function resolveTeamLayoutLabel(
  teamMembers: PlayerSlot[],
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  const teamIds = new Set(teamMembers.map((member) => member.team));

  if (teamIds.has(100) && teamIds.has(200)) {
    return t("ongoingGame.titlebar.layoutBlueRed", {
      defaultValue: "Blue vs Red",
    });
  }

  if (teamIds.size > 2) {
    return t("ongoingGame.titlebar.layoutMultiTeam", {
      defaultValue: "Multi-Team",
    });
  }

  return t("ongoingGame.titlebar.layoutTeams", {
    defaultValue: "Team Layout",
  });
}
