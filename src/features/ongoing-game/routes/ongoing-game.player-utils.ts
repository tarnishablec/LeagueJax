import type {
  ChampSelectSessionData,
  GameflowSessionData,
} from "@/bindings/lcu_events";
import type { SummonerInfo } from "@/bindings/summoner";
import type { PlayerSlot } from "./ongoing-game.types";

const MULTI_TEAM_QUEUE_IDS = new Set<number>([
  1700, // Arena 2v2v2v2
  1710, // Arena variants
  1720, // Arena variants
]);

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

function resolveQueueIdFromSessions(
  gameflowSession: GameflowSessionData | null,
  champSelectSession: ChampSelectSessionData | null,
): number | null {
  const fromGameflow = gameflowSession?.gameData.queue.id;
  if (typeof fromGameflow === "number" && fromGameflow > 0) {
    return fromGameflow;
  }

  const fromChampSelect = champSelectSession?.queueId;
  if (typeof fromChampSelect === "number" && fromChampSelect > 0) {
    return fromChampSelect;
  }

  return null;
}

function isBlueTeamSlot(slot: PlayerSlot): boolean {
  return slot.team === 100 || slot.team === 1;
}

function isRedTeamSlot(slot: PlayerSlot): boolean {
  return slot.team === 200 || slot.team === 2;
}

function shouldUseTopBottomLayout(
  queueId: number | null,
  teamMembers: PlayerSlot[],
): boolean {
  if (typeof queueId === "number" && queueId > 0) {
    return !MULTI_TEAM_QUEUE_IDS.has(queueId);
  }

  const hasBlue = teamMembers.some((member) => isBlueTeamSlot(member));
  const hasRed = teamMembers.some((member) => isRedTeamSlot(member));
  return hasBlue || hasRed;
}

function orderByGameflowTeam(
  members: PlayerSlot[],
  gameflowTeamPuuids: string[],
): PlayerSlot[] {
  if (members.length <= 1 || gameflowTeamPuuids.length === 0) {
    return members;
  }

  const byPuuid = new Map<string, PlayerSlot[]>();
  for (const member of members) {
    const list = byPuuid.get(member.puuid);
    if (list) {
      list.push(member);
    } else {
      byPuuid.set(member.puuid, [member]);
    }
  }

  const ordered: PlayerSlot[] = [];
  for (const puuid of gameflowTeamPuuids) {
    if (!puuid || puuid.trim().length === 0) {
      continue;
    }
    const list = byPuuid.get(puuid);
    if (!list || list.length === 0) {
      continue;
    }
    const member = list.shift();
    if (member) {
      ordered.push(member);
    }
  }

  for (const member of members) {
    if (!ordered.includes(member)) {
      ordered.push(member);
    }
  }

  return ordered;
}

export function resolveOngoingTeamGroups(params: {
  teamMembers: PlayerSlot[];
  gameflowSession: GameflowSessionData | null;
  champSelectSession: ChampSelectSessionData | null;
}): Array<{ teamId: number; members: PlayerSlot[] }> {
  const { teamMembers, gameflowSession, champSelectSession } = params;
  const queueId = resolveQueueIdFromSessions(
    gameflowSession,
    champSelectSession,
  );
  const topBottom = shouldUseTopBottomLayout(queueId, teamMembers);

  if (!topBottom) {
    return groupTeamMembers(teamMembers);
  }

  const blueMembers = teamMembers.filter((member) => isBlueTeamSlot(member));
  const redMembers = teamMembers.filter((member) => isRedTeamSlot(member));

  const orderedBlueMembers = orderByGameflowTeam(
    blueMembers,
    gameflowSession?.gameData.teamOne.map((player) => player.puuid) ?? [],
  );
  const orderedRedMembers = orderByGameflowTeam(
    redMembers,
    gameflowSession?.gameData.teamTwo.map((player) => player.puuid) ?? [],
  );

  return [
    { teamId: 100, members: orderedBlueMembers },
    { teamId: 200, members: orderedRedMembers },
  ];
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
