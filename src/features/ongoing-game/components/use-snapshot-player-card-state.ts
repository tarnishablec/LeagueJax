import type { Accessor } from "solid-js";
import { createMemo } from "solid-js";
import type { RankEntry } from "@/bindings/rank.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { useSolidMatchPerformanceStrategy } from "@/features/history/hooks/use-match-performance-strategy";
import { useSolidRankedSummary } from "@/features/history/hooks/use-ranked-summary";
import { useSolidTranslation } from "@/i18n/solid";
import { useSolidLcuStore } from "@/stores/lcu";
import { resolveRecentGameResult } from "../routes/ongoing-game.history-utils.ts";
import { isBotSlot } from "../routes/ongoing-game.player-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import { useSolidOngoingGameStore } from "../store";
import type { PlayerSquadAssignment } from "./player-card-squads.ts";
import {
  collectBotPlayerCardTag,
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
  entry: RankEntry | null;
  lpLabel: string;
  queueLabel: string;
};

function formatAverageKdaText(games: EnrichedMatch[]): string {
  const averageKda = computeAverageKda(games);
  return averageKda == null ? "--" : averageKda.toFixed(2);
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

export function useSolidSnapshotPlayerCardState(params: {
  slot: Accessor<PlayerSlot>;
  matchHistoryCount: Accessor<number>;
  enabledPlayerCardTagIds: Accessor<readonly string[]>;
  playerCardTagColors: Accessor<Readonly<Record<string, string>>>;
  squadAssignment: Accessor<PlayerSquadAssignment | undefined>;
}) {
  const { t } = useSolidTranslation();
  const ongoingState = useSolidOngoingGameStore();
  const lcuState = useSolidLcuStore();
  const performanceStrategy = useSolidMatchPerformanceStrategy();
  const isBot = createMemo(() => isBotSlot(params.slot()));
  const normalizedPuuid = createMemo(() =>
    !isBot() ? params.slot().puuid.trim() : "",
  );
  const puuid = createMemo(() =>
    normalizedPuuid().length > 0 ? normalizedPuuid() : undefined,
  );
  const rankedQuery = useSolidRankedSummary(puuid);
  const summoner = createMemo(() => {
    const id = puuid();
    return id ? ongoingState().summonersByPuuid[id] : undefined;
  });
  const historyBucket = createMemo(() => {
    const id = puuid();
    return id ? ongoingState().matchHistoriesByPuuid[id] : undefined;
  });
  const historyState = createMemo(() => {
    const id = puuid();
    return id ? ongoingState().historyStatesByPuuid[id] : undefined;
  });
  const hasHistoryBucket = createMemo(() => {
    const id = puuid();
    return id ? Object.hasOwn(ongoingState().matchHistoriesByPuuid, id) : false;
  });
  const ownPuuid = createMemo(
    () =>
      lcuState()
        .instances.find(
          (instance) => instance.isFocused && instance.state === "ready",
        )
        ?.summoner?.puuid.trim() || undefined,
  );
  const ownHistoryBucket = createMemo(() => {
    const id = ownPuuid();
    return id ? ongoingState().matchHistoriesByPuuid[id] : undefined;
  });
  const isHistoryLoading = createMemo(() =>
    Boolean(
      !isBot() &&
        puuid() &&
        historyState()?.status === "loading" &&
        !hasHistoryBucket() &&
        ongoingState().phase !== "Idle",
    ),
  );
  const hasHistoryLoadFailed = createMemo(() =>
    Boolean(
      !isBot() &&
        puuid() &&
        historyState()?.status === "failed" &&
        !hasHistoryBucket() &&
        ongoingState().phase !== "Idle",
    ),
  );
  const hasHiddenCareer = createMemo(
    () => hasHistoryLoadFailed() || summoner()?.privacy === "PRIVATE",
  );
  const recentGames = createMemo<EnrichedMatch[]>(() => {
    const id = puuid();
    const bucket = historyBucket();
    if (!id || !bucket || bucket.length === 0) {
      return [];
    }

    const filteredGames: EnrichedMatch[] = [];
    for (const game of bucket) {
      const me = game.json.participants.find(
        (participant) => participant.puuid === id,
      );
      if (!me) {
        continue;
      }

      filteredGames.push({ ...game, me });
      if (filteredGames.length >= params.matchHistoryCount()) {
        break;
      }
    }

    return filteredGames;
  });
  const soloRankEntry = createMemo(
    () => rankedQuery.data()?.queueMap.RANKED_SOLO_5x5 ?? null,
  );
  const flexRankEntry = createMemo(
    () => rankedQuery.data()?.queueMap.RANKED_FLEX_SR ?? null,
  );
  const identity = createMemo(() => resolveSummonerIdentity(summoner()));
  const lpLabel = () => t("ongoingGame.rank.lpShort", { defaultValue: "LP" });
  const rankItems = createMemo<PlayerCardRankDisplayItem[]>(() => [
    {
      id: "solo",
      entry: soloRankEntry(),
      lpLabel: lpLabel(),
      queueLabel: t("ongoingGame.rank.soloShort", {
        defaultValue: "Solo",
      }),
    },
    {
      id: "flex",
      entry: flexRankEntry(),
      lpLabel: lpLabel(),
      queueLabel: t("ongoingGame.rank.flexShort", {
        defaultValue: "Flex",
      }),
    },
  ]);
  const averageKdaText = createMemo(() => formatAverageKdaText(recentGames()));
  const winRateStat = createMemo(() => {
    const stat = computeWinRateStat(recentGames(), averageKdaText());
    return {
      ...stat,
      text: `${t("ongoingGame.winRate", {
        defaultValue: "Win rate",
      })} ${stat.text}`,
    };
  });
  const isSelf = createMemo(() =>
    Boolean(puuid() && ownPuuid() && puuid() === ownPuuid()),
  );
  const wasEncountered = createMemo(() =>
    Boolean(
      puuid() &&
        !isSelf() &&
        hasEncounteredPlayer(ownHistoryBucket(), puuid() ?? ""),
    ),
  );
  const squadTag = createMemo(
    () =>
      collectSquadPlayerCardTags({
        assignment: params.squadAssignment(),
        t,
      })[0],
  );
  const botTag = createMemo(() =>
    collectBotPlayerCardTag({
      colors: params.playerCardTagColors(),
      enabledIds: params.enabledPlayerCardTagIds(),
      isBot: isBot(),
      t,
    }),
  );
  const playerTags = createMemo(() =>
    sortPlayerCardTags([
      ...collectMatchPlayerCardTags(
        recentGames(),
        params.enabledPlayerCardTagIds(),
        params.playerCardTagColors(),
        params.slot(),
        performanceStrategy(),
        t,
      ),
      ...collectSpecialPlayerCardTags({
        colors: params.playerCardTagColors(),
        enabledIds: params.enabledPlayerCardTagIds(),
        hasHiddenCareer: hasHiddenCareer(),
        isSelf: isSelf(),
        recentGames: recentGames(),
        slot: params.slot(),
        t,
        wasEncountered: wasEncountered(),
      }),
    ]),
  );

  return {
    championId: () =>
      params.slot().championId > 0 ? params.slot().championId : null,
    botTag,
    hasHistoryLoadFailed,
    historyLoadFailedText: () =>
      t("ongoingGame.historyLoadFailed", {
        defaultValue: "Failed to load history",
      }),
    isBot,
    isHistoryLoading,
    level: () => summoner()?.summonerLevel || 0,
    noHistoryText: () =>
      t("ongoingGame.noHistory", {
        defaultValue: "No match history",
      }),
    historyPuuid: () => summoner()?.puuid.trim() || undefined,
    identity,
    rankItems,
    recentGames,
    showRank: () => !isBot() && Boolean(puuid()),
    squadTag,
    playerTags,
    winRateStat,
  };
}
