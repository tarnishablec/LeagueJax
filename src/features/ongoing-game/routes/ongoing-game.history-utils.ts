import type { EnrichedMatch } from "@/features/history/hooks/use-match-history";
import type { RecentGameResult } from "./ongoing-game.types";

export function resolveRecentGameResult(game: EnrichedMatch): RecentGameResult {
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
