import type {
  RawMatchSummariesResponse,
  RawMatchSummaryGame,
  RawMatchSummaryStyle,
  RawMatchSummaryParticipant as RawParticipant,
} from "@/bindings/matches.ts";
import type {
  MatchSummary,
  MatchSummaryParticipant,
} from "../types/match-summary";

function toNumber(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return value;
}

function toTrimmedString(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function splitRiotId(value: string): { gameName: string; tagLine: string } {
  const [gameName, tagLine] = value.split("#", 2);
  return {
    gameName: gameName?.trim() ?? "",
    tagLine: tagLine?.trim() ?? "",
  };
}

function parseGameId(game: RawMatchSummaryGame): number {
  const fromJson = toNumber(game.json.gameId);
  if (fromJson > 0) {
    return fromJson;
  }

  const matchId = game.metadata.match_id;
  if (!matchId) {
    return 0;
  }

  const suffix = matchId.split("_").at(-1);
  if (!suffix) {
    return 0;
  }

  const parsed = Number(suffix);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatusText(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .filter((char) => /[a-z0-9]/.test(char))
    .join("");
}

function isTerminatedResult(value: string): boolean {
  const normalized = normalizeStatusText(value);
  return (
    normalized.includes("abort") ||
    normalized.includes("terminated") ||
    normalized.includes("cancel") ||
    normalized.includes("invalid")
  );
}

function isRemakeResult(value: string): boolean {
  const normalized = normalizeStatusText(value);
  return (
    normalized.includes("remake") ||
    normalized.includes("earlysurrender") ||
    normalized.includes("surrenderedearly")
  );
}

function participantItems(participant: RawParticipant): MatchSummary["items"] {
  return [
    toNumber(participant.item0),
    toNumber(participant.item1),
    toNumber(participant.item2),
    toNumber(participant.item3),
    toNumber(participant.item4),
    toNumber(participant.item5),
    toNumber(participant.item6),
  ];
}

function participantAugments(
  participant: RawParticipant,
): MatchSummary["playerAugments"] {
  return [
    toNumber(participant.playerAugment1),
    toNumber(participant.playerAugment2),
    toNumber(participant.playerAugment3),
    toNumber(participant.playerAugment4),
    toNumber(participant.playerAugment5),
    toNumber(participant.playerAugment6),
  ];
}

function pickPrimaryStyle(
  styles: RawMatchSummaryStyle[],
): RawMatchSummaryStyle | undefined {
  return (
    styles.find(
      (style) => style.description?.toLowerCase().trim() === "primarystyle",
    ) ?? styles[0]
  );
}

function pickSubStyle(
  styles: RawMatchSummaryStyle[],
  primaryStyle: RawMatchSummaryStyle | undefined,
): RawMatchSummaryStyle | undefined {
  const describedSub = styles.find(
    (style) => style.description?.toLowerCase().trim() === "substyle",
  );
  if (describedSub) {
    return describedSub;
  }

  const primaryStyleId = toNumber(primaryStyle?.style);
  if (primaryStyleId > 0) {
    const different = styles.find(
      (style) =>
        toNumber(style.style) > 0 && toNumber(style.style) !== primaryStyleId,
    );
    if (different) {
      return different;
    }
  }

  return styles[1];
}

function firstSelectionPerkId(style: RawMatchSummaryStyle | undefined): number {
  if (!style) {
    return 0;
  }
  return toNumber(style.selections[0]?.perk);
}

function perkIds(participant: RawParticipant): {
  primaryRuneId: number;
  subStyleId: number;
} {
  const styles = participant.perks?.styles ?? [];
  const primaryStyle = pickPrimaryStyle(styles);
  const subStyle = pickSubStyle(styles, primaryStyle);

  return {
    primaryRuneId: firstSelectionPerkId(primaryStyle),
    subStyleId: toNumber(subStyle?.style),
  };
}

function toSummaryParticipant(
  participant: RawParticipant,
): MatchSummaryParticipant {
  const summonerName = toTrimmedString(participant.summonerName);
  const fallbackRiotId = splitRiotId(summonerName);
  const gameName =
    toTrimmedString(participant.riotIdGameName) || fallbackRiotId.gameName;
  const tagLine =
    toTrimmedString(participant.riotIdTagline) || fallbackRiotId.tagLine;

  const resolvedPuuid =
    toTrimmedString(participant.puuid) ||
    `participant-${toNumber(participant.participantId)}`;

  return {
    puuid: resolvedPuuid,
    championId: toNumber(participant.championId),
    gameName,
    tagLine,
    teamId: toNumber(participant.teamId),
  };
}

function matchOutcome(
  participant: RawParticipant,
  endOfGameResult: string,
): MatchSummary["outcome"] {
  if (isTerminatedResult(endOfGameResult)) {
    return "terminated";
  }

  if (
    participant.gameEndedInEarlySurrender ||
    isRemakeResult(endOfGameResult)
  ) {
    return "remake";
  }

  return participant.win ? "victory" : "defeat";
}

function parseSingleGame(
  game: RawMatchSummaryGame,
  targetPuuid: string,
): MatchSummary | null {
  const participants = game.json.participants;
  if (!participants.length) {
    return null;
  }

  const participant =
    participants.find((entry) => entry.puuid === targetPuuid) ??
    participants[0];
  if (!participant) {
    return null;
  }

  const teamId = toNumber(participant.teamId);
  const totalDamage = toNumber(participant.totalDamageDealtToChampions);
  const teamTotalDamage = participants
    .filter((entry) => toNumber(entry.teamId) === teamId)
    .reduce(
      (sum, entry) => sum + toNumber(entry.totalDamageDealtToChampions),
      0,
    );
  const damageShare = teamTotalDamage > 0 ? totalDamage / teamTotalDamage : 0;

  const perks = perkIds(participant);
  const gameId = parseGameId(game);
  const gameMutator = game.json.gameModeMutators[0] ?? "";
  const endOfGameResult = toTrimmedString(game.json.endOfGameResult);

  return {
    gameId,
    championId: toNumber(participant.championId),
    win: Boolean(participant.win),
    outcome: matchOutcome(participant, endOfGameResult),
    teamId,
    kills: toNumber(participant.kills),
    deaths: toNumber(participant.deaths),
    assists: toNumber(participant.assists),
    cs:
      toNumber(participant.totalMinionsKilled) +
      toNumber(participant.neutralMinionsKilled),
    totalDamageDealtToChampions: totalDamage,
    damageShare,
    spell1Id: toNumber(participant.spell1Id),
    spell2Id: toNumber(participant.spell2Id),
    perkPrimaryRuneId: perks.primaryRuneId,
    perkSubStyleId: perks.subStyleId,
    playerAugments: participantAugments(participant),
    items: participantItems(participant),
    mapId: toNumber(game.json.mapId),
    gameDuration: toNumber(game.json.gameDuration),
    gameMode: toTrimmedString(game.json.gameMode),
    gameMutator,
    gameCreation: toNumber(game.json.gameCreation),
    queueId: toNumber(game.json.queueId),
    participants: participants.map(toSummaryParticipant),
  };
}

export function parseRawMatchSummaries(
  payload: RawMatchSummariesResponse,
  targetPuuid: string,
): MatchSummary[] {
  return payload.games
    .map((game) => parseSingleGame(game, targetPuuid))
    .filter((game): game is MatchSummary => game !== null);
}
