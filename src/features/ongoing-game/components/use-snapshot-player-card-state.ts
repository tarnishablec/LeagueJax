import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { useRankedSummary } from "@/features/history/hooks/use-ranked-summary.ts";
import { useRankIcon } from "@/hooks/use-rank-icon.ts";
import { useLcuStore } from "@/stores/lcu";
import {
  formatRankEntryLabel,
  getBestRankEntry,
  resolveRankTierForIcon,
} from "@/utils/rank-display";
import { resolveRecentGameResult } from "../routes/ongoing-game.history-utils.ts";
import { isBotSlot } from "../routes/ongoing-game.player-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import { useOngoingGameStore } from "../store";
import {
  collectMatchPlayerCardTags,
  collectSpecialPlayerCardTags,
  computeAverageKda,
  hasEncounteredPlayer,
  type PlayerCardMatch,
  sortPlayerCardTags,
} from "./player-card-tags.ts";

export type EnrichedMatch = PlayerCardMatch;

export type WinRateTone = "win" | "lose" | "neutral";

export type WinRateStat = {
  text: string;
  tone: WinRateTone;
};

function formatAverageKdaText(games: EnrichedMatch[]): string {
  const averageKda = computeAverageKda(games);
  return averageKda == null ? "--" : averageKda.toFixed(2);
}

function computeWinRateStat(games: EnrichedMatch[]): WinRateStat {
  let wins = 0;
  let losses = 0;
  for (const game of games) {
    const result = resolveRecentGameResult(game);
    if (result === "Win") {
      wins += 1;
    } else if (result === "Lose") {
      losses += 1;
    }
  }

  const decided = wins + losses;
  if (decided === 0) {
    return { text: "-- (0)", tone: "neutral" };
  }

  const percentage = Math.round((wins / decided) * 100);
  const tone: WinRateTone =
    percentage < 45 ? "lose" : percentage > 60 ? "win" : "neutral";
  return { text: `${percentage}% (${decided})`, tone };
}

function normalizeChampionId(slot: PlayerSlot): number | null {
  const championId =
    slot.championId > 0 ? slot.championId : slot.championPickIntent;
  return championId > 0 ? championId : null;
}

function resolveSummonerIdentity(
  slot: PlayerSlot,
  summoner: SummonerInfo | undefined,
) {
  const gameName = summoner?.gameName.trim() || slot.gameName.trim();
  if (gameName.length === 0) {
    return undefined;
  }

  return {
    gameName,
    tagLine: summoner?.tagLine.trim() || slot.tagLine.trim(),
  };
}

export function useSnapshotPlayerCardState(
  slot: PlayerSlot,
  matchHistoryCount: number,
  enabledPlayerCardTagIds: readonly string[],
  playerCardTagColors: Readonly<Record<string, string>>,
) {
  const { t } = useTranslation();
  const phase = useOngoingGameStore((state) => state.phase);

  const isBot = isBotSlot(slot);
  const normalizedPuuid = !isBot ? slot.puuid.trim() : "";
  const puuid = normalizedPuuid.length > 0 ? normalizedPuuid : undefined;
  const rankedQuery = useRankedSummary(puuid);
  const summoner = useOngoingGameStore((state) =>
    puuid ? state.summonersByPuuid[puuid] : undefined,
  );
  const historyBucket = useOngoingGameStore((state) =>
    puuid ? state.matchHistoriesByPuuid[puuid] : undefined,
  );
  const historyState = useOngoingGameStore((state) =>
    puuid ? state.historyStatesByPuuid[puuid] : undefined,
  );
  const hasHistoryBucket = useOngoingGameStore((state) =>
    puuid ? Object.hasOwn(state.matchHistoriesByPuuid, puuid) : false,
  );
  const ownPuuid = useLcuStore(
    (state) =>
      state.instances
        .find((instance) => instance.isFocused && instance.state === "ready")
        ?.summoner?.puuid.trim() || undefined,
  );
  const ownHistoryBucket = useOngoingGameStore((state) =>
    ownPuuid ? state.matchHistoriesByPuuid[ownPuuid] : undefined,
  );

  const isHistoryLoading = Boolean(
    !isBot &&
      puuid &&
      historyState?.status === "loading" &&
      !hasHistoryBucket &&
      phase !== "Idle",
  );

  const hasHistoryLoadFailed = Boolean(
    !isBot &&
      puuid &&
      historyState?.status === "failed" &&
      !hasHistoryBucket &&
      phase !== "Idle",
  );

  const recentGames = useMemo<EnrichedMatch[]>(() => {
    if (!puuid || !historyBucket || historyBucket.length === 0) {
      return [];
    }

    const filteredGames: EnrichedMatch[] = [];
    for (const game of historyBucket) {
      const me = game.json.participants.find(
        (participant) => participant.puuid === puuid,
      );
      if (!me) {
        continue;
      }

      filteredGames.push({ ...game, me });
      if (filteredGames.length >= matchHistoryCount) {
        break;
      }
    }

    return filteredGames;
  }, [historyBucket, puuid, matchHistoryCount]);

  const rankEntry = getBestRankEntry(rankedQuery.data);
  const rankIcon = useRankIcon(resolveRankTierForIcon(rankEntry), true);
  const identity = useMemo(
    () => resolveSummonerIdentity(slot, summoner),
    [slot, summoner],
  );

  const winRateStat = useMemo(
    () => computeWinRateStat(recentGames),
    [recentGames],
  );
  const averageKdaText = useMemo(
    () => formatAverageKdaText(recentGames),
    [recentGames],
  );
  const isSelf = Boolean(puuid && ownPuuid && puuid === ownPuuid);
  const wasEncountered = Boolean(
    puuid && !isSelf && hasEncounteredPlayer(ownHistoryBucket, puuid),
  );
  const playerTags = useMemo(
    () =>
      sortPlayerCardTags([
        ...collectMatchPlayerCardTags(
          recentGames,
          enabledPlayerCardTagIds,
          playerCardTagColors,
          slot,
          t,
        ),
        ...collectSpecialPlayerCardTags({
          colors: playerCardTagColors,
          enabledIds: enabledPlayerCardTagIds,
          hasHistoryLoadFailed,
          isSelf,
          recentGames,
          slot,
          t,
          wasEncountered,
        }),
      ]),
    [
      enabledPlayerCardTagIds,
      hasHistoryLoadFailed,
      isSelf,
      playerCardTagColors,
      recentGames,
      slot,
      t,
      wasEncountered,
    ],
  );

  return {
    averageKdaText,
    championId: normalizeChampionId(slot),
    hasHistoryLoadFailed,
    historyLoadFailedText: t("ongoingGame.historyLoadFailed", {
      defaultValue: "Failed to load history",
    }),
    isBot,
    isHistoryLoading,
    level: summoner?.summonerLevel || 0,
    noHistoryText: t("ongoingGame.noHistory", {
      defaultValue: "No match history",
    }),
    identity,
    rankIcon,
    rankText: formatRankEntryLabel(t, rankEntry),
    recentGames,
    showRank: !isBot && Boolean(puuid),
    playerTags,
    winRateStat,
  };
}
