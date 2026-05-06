import type {
  ChampSelectSessionData,
  GameflowSessionData,
} from "@/bindings/lcu_events";
import type { OngoingGamePhase } from "@/bindings/ongoing_game";
import type { PlayerSlot } from "./ongoing-game.types";

const MULTI_TEAM_QUEUE_IDS = new Set<number>([
  1700, // Arena 2v2v2v2
  1710, // Arena variants
  1720, // Arena variants
  3140, // Hextech ARAM variants
]);

function isMultiTeamQueueId(queueId: number | null): boolean {
  return typeof queueId === "number" && MULTI_TEAM_QUEUE_IDS.has(queueId);
}

export type OngoingTeamSide = "blue" | "red";

export function isBotSlot(slot: PlayerSlot): boolean {
  return slot.slotKind === "bot";
}

export function shouldRenderSlot(slot: PlayerSlot, showBots: boolean): boolean {
  if (slot.slotKind === "placeholder") {
    return false;
  }

  return showBots || !isBotSlot(slot);
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

function isBlueTeamSlot(slot: PlayerSlot, _phase: OngoingGamePhase): boolean {
  return slot.team === 1 || slot.team === 100;
}

function isRedTeamSlot(slot: PlayerSlot, _phase: OngoingGamePhase): boolean {
  return slot.team === 2 || slot.team === 200;
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
    return !isMultiTeamQueueId(queueId);
  }

  const hasBlue = teamMembers.some((member) => isBlueTeamSlot(member, phase));
  const hasRed = teamMembers.some((member) => isRedTeamSlot(member, phase));
  return hasBlue || hasRed;
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
  } = params;
  const queueId =
    typeof effectiveQueueId === "number" && effectiveQueueId > 0
      ? effectiveQueueId
      : resolveQueueIdFromSessions(gameflowSession, champSelectSession);
  const topBottom = shouldUseTopBottomLayout(phase, queueId, teamMembers);

  if (!topBottom) {
    return groupTeamMembers(teamMembers);
  }

  const blueMembers = teamMembers.filter((member) =>
    isBlueTeamSlot(member, phase),
  );
  const redMembers = teamMembers.filter((member) =>
    isRedTeamSlot(member, phase),
  );
  const matchedMembers = blueMembers.length + redMembers.length;
  if (matchedMembers !== teamMembers.length) {
    return groupTeamMembers(teamMembers);
  }

  const blueTeamId =
    blueMembers[0]?.team ?? (phase === "ChampSelect" ? 1 : 100);
  const redTeamId = redMembers[0]?.team ?? (phase === "ChampSelect" ? 2 : 200);

  return [
    { teamId: blueTeamId, members: blueMembers },
    { teamId: redTeamId, members: redMembers },
  ];
}

function sideFromTeamId(teamId: number): OngoingTeamSide | null {
  const normalizedTeamId = normalizeTeamId(teamId);
  if (normalizedTeamId === 1) {
    return "blue";
  }

  if (normalizedTeamId === 2) {
    return "red";
  }

  return null;
}

function isVisibleSideSlot(slot: PlayerSlot): boolean {
  return slot.slotKind !== "placeholder";
}

export function resolveOwnOngoingTeamSide(params: {
  phase: OngoingGamePhase;
  teamMembers: PlayerSlot[];
  gameflowSession: GameflowSessionData | null;
  champSelectSession: ChampSelectSessionData | null;
  effectiveQueueId?: number | null;
  ownPuuid?: string | null;
}): OngoingTeamSide | null {
  const {
    phase,
    teamMembers,
    gameflowSession,
    champSelectSession,
    effectiveQueueId,
    ownPuuid,
  } = params;
  if (phase !== "ChampSelect" && phase !== "InGame") {
    return null;
  }

  const queueId =
    typeof effectiveQueueId === "number" && effectiveQueueId > 0
      ? effectiveQueueId
      : resolveQueueIdFromSessions(gameflowSession, champSelectSession);
  if (!shouldUseTopBottomLayout(phase, queueId, teamMembers)) {
    return null;
  }

  const normalizedOwnPuuid = ownPuuid?.trim();
  const ownSlot =
    normalizedOwnPuuid && normalizedOwnPuuid.length > 0
      ? teamMembers.find(
          (member) =>
            member.puuid.trim() === normalizedOwnPuuid &&
            isVisibleSideSlot(member),
        )
      : undefined;
  if (ownSlot) {
    return sideFromTeamId(ownSlot.team);
  }

  if (phase !== "ChampSelect") {
    return null;
  }

  const localPlayerCellId = champSelectSession?.localPlayerCellId;
  if (typeof localPlayerCellId !== "number" || localPlayerCellId < 0) {
    return null;
  }

  const cellSlot = teamMembers.find(
    (member) =>
      member.cellId === localPlayerCellId && isVisibleSideSlot(member),
  );
  return cellSlot ? sideFromTeamId(cellSlot.team) : null;
}

/** Maps both champ-select (1/2) and in-game (100/200) team IDs to a stable value. */
export function normalizeTeamId(teamId: number): number {
  if (teamId === 1 || teamId === 100) return 1;
  if (teamId === 2 || teamId === 200) return 2;
  return teamId;
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
