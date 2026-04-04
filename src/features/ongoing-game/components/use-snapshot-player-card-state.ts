import type { TFunction } from "i18next";
import { useMemo } from "react";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { useRankedSummary } from "@/features/history/hooks/use-ranked-summary.ts";
import { useRankIcon } from "@/hooks/use-rank-icon.ts";
import {
  formatRankEntryLabel,
  getBestRankEntry,
  resolveRankTierForIcon,
} from "@/utils/rank-display";
import { isBotSlot } from "../routes/ongoing-game.player-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import { useOngoingGameStore } from "../store";

export type EnrichedMatch = RawMatchSummaryGame & {
  me: RawMatchSummaryParticipant;
};

function normalizeChampionId(slot: PlayerSlot): number | null {
  const championId =
    slot.championId > 0 ? slot.championId : slot.championPickIntent;
  return championId > 0 ? championId : null;
}

export function useSnapshotPlayerCardState(
  slot: PlayerSlot,
  matchHistoryCount: number,
  t: TFunction,
) {
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

  return {
    championId: normalizeChampionId(slot),
    hasHistoryLoadFailed,
    historyLoadFailedText: t("ongoingGame.historyLoadFailed", {
      defaultValue: "Failed to load history",
    }),
    isBot,
    isHistoryLoading,
    level: summoner?.summonerLevel || 0,
    rankIcon,
    rankText: formatRankEntryLabel(t, rankEntry),
    recentGames,
    summoner,
  };
}
