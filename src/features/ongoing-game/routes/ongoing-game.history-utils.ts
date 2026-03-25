import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches";
import type { OngoingGamePlayerSnapshot } from "@/bindings/ongoing_game";
import type {
  MatchHistoryModeContext,
  RecentGameResult,
  RecentGameSummary,
} from "./ongoing-game.types";

function normalizeMode(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toUpperCase();
}

function matchHistoryGameInCurrentMode(
  game: RawMatchSummaryGame,
  context: MatchHistoryModeContext,
): boolean {
  if (context.filter === "All") {
    return true;
  }

  let hasCondition = false;

  if (context.queueId && context.queueId > 0) {
    hasCondition = true;
    if (game.json.queueId !== context.queueId) {
      return false;
    }
  }

  if (context.mapId && context.mapId > 0) {
    hasCondition = true;
    if (game.json.mapId !== context.mapId) {
      return false;
    }
  }

  const currentMode = normalizeMode(context.gameMode);
  if (currentMode) {
    hasCondition = true;
    const gameMode = normalizeMode(game.json.gameMode);
    if (gameMode !== currentMode) {
      return false;
    }
  }

  if (!hasCondition) {
    return true;
  }

  return true;
}

function normalizeChampionId(
  championId: number | null | undefined,
): number | null {
  if (!championId || championId <= 0) {
    return null;
  }
  return championId;
}

function resolveRecentGameResult(
  game: RawMatchSummaryGame,
  participant: RawMatchSummaryParticipant | null,
): RecentGameResult {
  const endOfGameResult = game.json.endOfGameResult ?? "";

  if (endOfGameResult.startsWith("Abort_")) {
    return "Terminated";
  }

  if (participant?.gameEndedInEarlySurrender) {
    return "Remake";
  }

  if (participant?.win === true) {
    return "Win";
  }

  if (participant?.win === false) {
    return "Lose";
  }

  return "Terminated";
}

export function toRecentGames(
  player: OngoingGamePlayerSnapshot,
  context: MatchHistoryModeContext,
): RecentGameSummary[] {
  const games = player.match_history?.games ?? [];

  return games
    .filter((game) => matchHistoryGameInCurrentMode(game, context))
    .map((game) => {
      const participant =
        game.json.participants.find((item) => item.puuid === player.puuid) ??
        null;

      return {
        gameId: game.json.gameId,
        result: resolveRecentGameResult(game, participant),
        championId: normalizeChampionId(participant?.championId),
        kills: participant?.kills ?? 0,
        deaths: participant?.deaths ?? 0,
        assists: participant?.assists ?? 0,
        cs:
          (participant?.totalMinionsKilled ?? 0) +
          (participant?.neutralMinionsKilled ?? 0),
        durationSec: game.json.gameDuration ?? 0,
      };
    });
}

export function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minute = Math.floor(totalSeconds / 60);
  const second = totalSeconds % 60;
  const secondText = second.toString().padStart(2, "0");
  return `${minute}m${secondText}`;
}

export function historyResultLabel(
  result: RecentGameResult,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  if (result === "Win") {
    return t("ongoingGame.historyResultWin", { defaultValue: "Win" });
  }
  if (result === "Lose") {
    return t("ongoingGame.historyResultLose", { defaultValue: "Lose" });
  }
  if (result === "Remake") {
    return t("ongoingGame.historyResultRemake", { defaultValue: "Remake" });
  }
  return t("ongoingGame.historyResultTerminated", {
    defaultValue: "Terminated",
  });
}

export function historyResultClassName(
  result: RecentGameResult,
  classNames: {
    winText: string;
    loseText: string;
    remakeText: string;
    terminatedText: string;
  },
): string {
  if (result === "Win") {
    return classNames.winText;
  }
  if (result === "Lose") {
    return classNames.loseText;
  }
  if (result === "Remake") {
    return classNames.remakeText;
  }
  return classNames.terminatedText;
}
