import type { RawMatchSummaryGame } from "@/bindings/matches";
import type { EnrichedMatch } from "@/features/history/hooks/use-match-history";
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

function resolveRecentGameResult(game: EnrichedMatch): RecentGameResult {
  const endOfGameResult = game.json.endOfGameResult ?? "";

  if (endOfGameResult.startsWith("Abort_")) {
    return "Terminated";
  }

  if (game.me.gameEndedInEarlySurrender) {
    return "Remake";
  }

  if (game.me.win === true) {
    return "Win";
  }

  if (game.me.win === false) {
    return "Lose";
  }

  return "Terminated";
}

export function toRecentGames(
  matches: EnrichedMatch[] | undefined,
  context: MatchHistoryModeContext,
): RecentGameSummary[] {
  const games = matches ?? [];

  return games
    .filter((game) => matchHistoryGameInCurrentMode(game, context))
    .map((game) => {
      return {
        gameId: game.json.gameId,
        result: resolveRecentGameResult(game),
        championId: normalizeChampionId(game.me.championId),
        kills: game.me.kills ?? 0,
        deaths: game.me.deaths ?? 0,
        assists: game.me.assists ?? 0,
        cs:
          (game.me.totalMinionsKilled ?? 0) +
          (game.me.neutralMinionsKilled ?? 0),
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
