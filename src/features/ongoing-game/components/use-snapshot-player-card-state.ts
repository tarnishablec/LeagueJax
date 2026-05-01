import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { RankEntry, Tier } from "@/bindings/rank.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { useRankedSummary } from "@/features/history/hooks/use-ranked-summary.ts";
import { useRankIcon } from "@/hooks/use-rank-icon.ts";
import { useLcuStore } from "@/stores/lcu";
import {
  formatRankTierLabel,
  resolveRankTierForIcon,
} from "@/utils/rank-display";
import { resolveRecentGameResult } from "../routes/ongoing-game.history-utils.ts";
import { isBotSlot } from "../routes/ongoing-game.player-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import { useOngoingGameStore } from "../store";
import type { PlayerSquadAssignment } from "./player-card-squads.ts";
import {
  collectMatchPlayerCardTags,
  collectSpecialPlayerCardTags,
  collectSquadPlayerCardTags,
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

export type PlayerCardRankDisplayItem = {
  id: "solo" | "flex";
  iconUrl: string;
  isRanked: boolean;
  queueLabel: string;
  tooltip: string;
  value: string;
};

const APEX_TIERS = new Set<Tier>(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function formatAverageKdaText(games: EnrichedMatch[]): string {
  const averageKda = computeAverageKda(games);
  return averageKda == null ? "--" : averageKda.toFixed(2);
}

function hasRank(entry: RankEntry | null | undefined): entry is RankEntry {
  return Boolean(entry?.tier && entry.tier !== "NONE");
}

function formatRankCardValue(
  t: ReturnType<typeof useTranslation>["t"],
  entry: RankEntry | null | undefined,
): string {
  if (!hasRank(entry)) {
    return "";
  }

  if (APEX_TIERS.has(entry.tier)) {
    return `${entry.leaguePoints} ${t("ongoingGame.rank.lpShort", { defaultValue: "LP" })}`;
  }

  const division = entry.division.trim();
  if (division.length > 0 && division !== "NA") {
    return division;
  }

  return `${entry.leaguePoints} ${t("ongoingGame.rank.lpShort", { defaultValue: "LP" })}`;
}

function formatRankCardTooltip(
  t: ReturnType<typeof useTranslation>["t"],
  entry: RankEntry | null | undefined,
): string {
  if (!hasRank(entry)) {
    return formatRankTierLabel(t, "NONE");
  }

  const tierLabel = formatRankTierLabel(t, entry.tier);
  if (APEX_TIERS.has(entry.tier)) {
    return `${tierLabel} ${entry.leaguePoints} ${t("ongoingGame.rank.lpShort", { defaultValue: "LP" })}`;
  }

  const division = entry.division.trim();
  if (division.length > 0 && division !== "NA") {
    return `${tierLabel} ${division}`;
  }

  return tierLabel;
}

function computeWinRateStat(
  games: EnrichedMatch[],
  averageKdaText: string,
): WinRateStat {
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
    return { text: `-- (${averageKdaText})`, tone: "neutral" };
  }

  const percentage = Math.round((wins / decided) * 100);
  const tone: WinRateTone =
    percentage < 45 ? "lose" : percentage > 60 ? "win" : "neutral";
  return { text: `${percentage}% (${averageKdaText})`, tone };
}

function normalizeChampionId(slot: PlayerSlot): number | null {
  const championId =
    slot.championId > 0 ? slot.championId : slot.championPickIntent;
  return championId > 0 ? championId : null;
}

function resolveSummonerIdentity(summoner: SummonerInfo | undefined) {
  const gameName = summoner?.gameName.trim() ?? "";
  if (gameName.length === 0) {
    return undefined;
  }

  return {
    gameName,
    tagLine: summoner?.tagLine.trim() ?? "",
  };
}

export function useSnapshotPlayerCardState(
  slot: PlayerSlot,
  matchHistoryCount: number,
  enabledPlayerCardTagIds: readonly string[],
  playerCardTagColors: Readonly<Record<string, string>>,
  squadAssignment: PlayerSquadAssignment | undefined,
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

  const soloRankEntry = rankedQuery.data?.queueMap.RANKED_SOLO_5x5 ?? null;
  const flexRankEntry = rankedQuery.data?.queueMap.RANKED_FLEX_SR ?? null;
  const soloRankIcon = useRankIcon(resolveRankTierForIcon(soloRankEntry), true);
  const flexRankIcon = useRankIcon(resolveRankTierForIcon(flexRankEntry), true);
  const identity = useMemo(() => resolveSummonerIdentity(summoner), [summoner]);
  const rankItems = useMemo<PlayerCardRankDisplayItem[]>(
    () => [
      {
        id: "solo",
        iconUrl: soloRankIcon,
        isRanked: hasRank(soloRankEntry),
        queueLabel: t("ongoingGame.rank.soloShort", {
          defaultValue: "Solo",
        }),
        tooltip: formatRankCardTooltip(t, soloRankEntry),
        value: formatRankCardValue(t, soloRankEntry),
      },
      {
        id: "flex",
        iconUrl: flexRankIcon,
        isRanked: hasRank(flexRankEntry),
        queueLabel: t("ongoingGame.rank.flexShort", {
          defaultValue: "Flex",
        }),
        tooltip: formatRankCardTooltip(t, flexRankEntry),
        value: formatRankCardValue(t, flexRankEntry),
      },
    ],
    [flexRankEntry, flexRankIcon, soloRankEntry, soloRankIcon, t],
  );

  const averageKdaText = useMemo(
    () => formatAverageKdaText(recentGames),
    [recentGames],
  );
  const winRateStat = useMemo(() => {
    const stat = computeWinRateStat(recentGames, averageKdaText);
    return {
      ...stat,
      text: `${t("ongoingGame.winRate", { defaultValue: "Win rate" })} ${stat.text}`,
    };
  }, [averageKdaText, recentGames, t]);
  const isSelf = Boolean(puuid && ownPuuid && puuid === ownPuuid);
  const wasEncountered = Boolean(
    puuid && !isSelf && hasEncounteredPlayer(ownHistoryBucket, puuid),
  );
  const squadTag = useMemo(
    () =>
      collectSquadPlayerCardTags({
        assignment: squadAssignment,
        t,
      })[0],
    [squadAssignment, t],
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
    historyPuuid: summoner?.puuid.trim() || undefined,
    identity,
    rankItems,
    recentGames,
    showRank: !isBot && Boolean(puuid),
    squadTag,
    playerTags,
    winRateStat,
  };
}
