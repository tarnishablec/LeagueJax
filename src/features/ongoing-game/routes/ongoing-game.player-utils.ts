import type { OngoingGamePhase } from "@/bindings/ongoing_game";
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
  3140, // Hextech ARAM variants
]);

export function isBotPuuid(rawPuuid: string): boolean {
  const puuid = rawPuuid.trim().toUpperCase();
  return !puuid || puuid === "BOT" || puuid.startsWith("BOT_");
}

export function isBotSlot(slot: PlayerSlot): boolean {
  if (slot.nameVisibilityType === "HIDDEN") {
    return false;
  }

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

function isBlueTeamSlot(slot: PlayerSlot, phase: OngoingGamePhase): boolean {
  if (phase === "ChampSelect") {
    return slot.team === 1;
  }

  return slot.team === 100;
}

function isRedTeamSlot(slot: PlayerSlot, phase: OngoingGamePhase): boolean {
  if (phase === "ChampSelect") {
    return slot.team === 2;
  }

  return slot.team === 200;
}

function shouldUseTopBottomLayout(
  phase: OngoingGamePhase,
  queueId: number | null,
  teamMembers: PlayerSlot[],
): boolean {
  const distinctTeamIds = new Set(
    teamMembers.map((member) => member.team).filter((teamId) => teamId > 0),
  );

  if (distinctTeamIds.size > 2) {
    return false;
  }

  if (typeof queueId === "number" && queueId > 0) {
    return !MULTI_TEAM_QUEUE_IDS.has(queueId);
  }

  const hasBlue = teamMembers.some((member) => isBlueTeamSlot(member, phase));
  const hasRed = teamMembers.some((member) => isRedTeamSlot(member, phase));
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
  phase: OngoingGamePhase;
  teamMembers: PlayerSlot[];
  gameflowSession: GameflowSessionData | null;
  champSelectSession: ChampSelectSessionData | null;
  effectiveQueueId?: number | null;
}): Array<{ teamId: number; members: PlayerSlot[] }> {
  const {
    phase,
    teamMembers,
    gameflowSession,
    champSelectSession,
    effectiveQueueId,
  } =
    params;
  const queueId =
    typeof effectiveQueueId === "number" && effectiveQueueId > 0
      ? effectiveQueueId
      : resolveQueueIdFromSessions(gameflowSession, champSelectSession);
  const topBottom = shouldUseTopBottomLayout(phase, queueId, teamMembers);

  if (!topBottom) {
    return groupTeamMembers(teamMembers);
  }

  const blueMembers = teamMembers.filter((member) => isBlueTeamSlot(member, phase));
  const redMembers = teamMembers.filter((member) => isRedTeamSlot(member, phase));
  const matchedMembers = blueMembers.length + redMembers.length;
  if (matchedMembers !== teamMembers.length) {
    return groupTeamMembers(teamMembers);
  }

  const orderedBlueMembers =
    phase === "InGame"
      ? orderByGameflowTeam(
          blueMembers,
          gameflowSession?.gameData.teamOne.map((player) => player.puuid) ?? [],
        )
      : blueMembers;
  const orderedRedMembers =
    phase === "InGame"
      ? orderByGameflowTeam(
          redMembers,
          gameflowSession?.gameData.teamTwo.map((player) => player.puuid) ?? [],
        )
      : redMembers;

  return [
    { teamId: phase === "ChampSelect" ? 1 : 100, members: orderedBlueMembers },
    { teamId: phase === "ChampSelect" ? 2 : 200, members: orderedRedMembers },
  ];
}

function compareTeamIds(left: number, right: number): number {
  if (left === right) {
    return 0;
  }

  if (left === 100 || left === 1) {
    return -1;
  }

  if (right === 100 || right === 1) {
    return 1;
  }

  if (left === 200 || left === 2) {
    return right === 100 || right === 1 ? 1 : -1;
  }

  if (right === 200 || right === 2) {
    return left === 100 || left === 1 ? -1 : 1;
  }

  return left - right;
}

export function resolveTeamLayoutLabel(
  teamMembers: PlayerSlot[],
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  const teamIds = new Set(teamMembers.map((member) => member.team));

  if (
    (teamIds.has(100) && teamIds.has(200)) ||
    (teamIds.has(1) && teamIds.has(2))
  ) {
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
