import { assignInlineVars } from "@vanilla-extract/dynamic";
import { Bot } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import type {
  RawMatchSummaryGame,
  RawMatchSummaryParticipant,
} from "@/bindings/matches.ts";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { LeaguePositionPair } from "@/components/league-position/LeaguePositionIcon.tsx";
import { SummonerID } from "@/components/SummonerID.tsx";
import type { MatchModeTag } from "@/features/history/hooks/use-match-history.ts";
import { useRankedSummary } from "@/features/history/hooks/use-ranked-summary.ts";
import { useLcuQueueName } from "@/hooks/use-lcu-queues.ts";
import { useRankIcon } from "@/hooks/use-rank-icon.ts";
import { vars } from "@/styles/theme.css.ts";
import {
  formatRankEntryLabel,
  getBestRankEntry,
  resolveRankTierForIcon,
} from "@/utils/rank-display";
import {
  historyResultClassName,
  historyResultLabel,
  resolveRecentGameResult,
} from "../routes/ongoing-game.history-utils.ts";
import { isBotSlot } from "../routes/ongoing-game.player-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import { useOngoingGameStore } from "../store";
import * as s from "./OngoingGameCards.css.ts";

type EnrichedMatch = RawMatchSummaryGame & {
  me: RawMatchSummaryParticipant;
};

function formatGameTime(epochMs: number): string {
  const d = new Date(epochMs);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function resolveQueueIdFromModeTag(
  modeTag: MatchModeTag | null,
): number | null {
  if (!modeTag || modeTag === "all" || !modeTag.startsWith("q_")) {
    return null;
  }

  const parsedQueueId = Number(modeTag.slice(2));
  if (!Number.isFinite(parsedQueueId) || parsedQueueId <= 0) {
    return null;
  }

  return parsedQueueId;
}

function normalizeChampionId(slot: PlayerSlot): number | null {
  const championId =
    slot.championId > 0 ? slot.championId : slot.championPickIntent;
  return championId > 0 ? championId : null;
}

function HistoryRow(props: { game: EnrichedMatch }) {
  const { game } = props;
  const { t } = useTranslation();
  const result = resolveRecentGameResult(game);
  const queueName = useLcuQueueName(game.json.queueId);
  const championId = game.me.championId > 0 ? game.me.championId : null;

  return (
    <div
      className={`${s.historyRow} ${historyResultClassName(result, {
        winText: s.winRow,
        loseText: s.loseRow,
        remakeText: s.remakeRow,
        terminatedText: s.terminatedRow,
      })}`}
    >
      <ChampionAvatar
        championId={championId}
        imageClassName={s.historyChampionAvatar}
        fallbackClassName={s.historyChampionFallback}
      />
      <div className={s.matchBrief}>
        <span className={s.queueNameText}>{queueName}</span>
        <div className={s.matchBriefDown}>
          <span
            className={`${historyResultClassName(result, {
              winText: s.winText,
              loseText: s.loseText,
              remakeText: s.remakeText,
              terminatedText: s.terminatedText,
            })}`}
          >
            {historyResultLabel(result, t)}
          </span>
          <span className={s.gameTimeText}>
            {formatGameTime(game.json.gameCreation)}
          </span>
        </div>
      </div>
      <span className={s.kdaText}>
        {game.me.kills ?? 0}/{game.me.deaths ?? 0}/{game.me.assists ?? 0}
      </span>
    </div>
  );
}

function HistoryLoadingState() {
  return (
    <SkeletonTheme
      baseColor={`color-mix(in oklch, ${vars.color.foreground} 8%, transparent)`}
      highlightColor={`color-mix(in oklch, ${vars.color.foreground} 16%, transparent)`}
      duration={1.2}
    >
      <div className={s.historyList} style={{ alignContent: "start" }}>
        <Skeleton width="100%" height={35} borderRadius={6} />
        <Skeleton width="100%" height={35} borderRadius={6} />
        <Skeleton width="100%" height={35} borderRadius={6} />
        <Skeleton width="100%" height={35} borderRadius={6} />
      </div>
    </SkeletonTheme>
  );
}

function SnapshotPlayerCard(props: {
  slot: PlayerSlot;
  matchHistoryCount: number;
}) {
  const { slot, matchHistoryCount } = props;
  const { t } = useTranslation();
  const storeModeTag = useOngoingGameStore((state) => state.modeTag);
  const summonersByPuuid = useOngoingGameStore(
    (state) => state.summonersByPuuid,
  );
  const matchHistoriesByPuuid = useOngoingGameStore(
    (state) => state.matchHistoriesByPuuid,
  );
  const matchHistoriesHydrated = useOngoingGameStore(
    (state) => state.matchHistoriesHydrated,
  );
  const queueFilterId = useMemo(
    () => resolveQueueIdFromModeTag(storeModeTag),
    [storeModeTag],
  );

  const isBot = isBotSlot(slot);
  const normalizedPuuid = !isBot ? slot.puuid.trim() : "";
  const puuid = normalizedPuuid.length > 0 ? normalizedPuuid : undefined;
  const rankedQuery = useRankedSummary(puuid);
  const summoner = puuid ? summonersByPuuid[puuid] : undefined;
  const historyBucket = puuid ? matchHistoriesByPuuid[puuid] : undefined;
  const hasHistoryBucket = puuid
    ? Object.hasOwn(matchHistoriesByPuuid, puuid)
    : false;
  const isHistoryLoading = Boolean(
    !isBot && puuid && !matchHistoriesHydrated && !hasHistoryBucket,
  );
  const recentGames = useMemo<EnrichedMatch[]>(() => {
    if (!puuid || !historyBucket || historyBucket.length === 0) {
      return [];
    }

    const filteredGames: EnrichedMatch[] = [];
    for (const game of historyBucket) {
      if (queueFilterId !== null && game.json.queueId !== queueFilterId) {
        continue;
      }

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
  }, [historyBucket, puuid, queueFilterId, matchHistoryCount]);

  const championId = normalizeChampionId(slot);
  const level = summoner?.summonerLevel || 0;
  const rankEntry = getBestRankEntry(rankedQuery.data);
  const rankText = formatRankEntryLabel(t, rankEntry);
  const rankIcon = useRankIcon(resolveRankTierForIcon(rankEntry), true);
  const showRankRow = !isBot;
  const noHistoryText = t("ongoingGame.noHistory", {
    defaultValue: "No match history",
  });

  return (
    <article className={s.playerCard}>
      <div className={s.playerHeader}>
        <ChampionAvatar
          championId={championId}
          imageClassName={s.championAvatar}
          fallbackClassName={s.championAvatarFallback}
          wrapperClassName={s.playerAvatarWrap}
          level={level > 0 ? level : undefined}
          levelClassName={s.levelBadge}
        />

        <div className={s.playerIdentity}>
          {summoner ? (
            <SummonerID
              summoner={summoner}
              styles={{
                gameName: {
                  fontSize: "0.75rem",
                },
                tagLine: {
                  fontSize: "0.7rem",
                },
              }}
            />
          ) : null}
          {showRankRow ? (
            <div className={s.rankRow}>
              <img src={rankIcon} alt="" className={s.rankMiniIcon} />
              <span className={s.rankText}>{rankText}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={s.playerStats}>
        <LeaguePositionPair
          assigned={slot.assignedPosition}
          primary={null}
          secondary={null}
          assignedWidth={16}
          assignedHeight={16}
          preferenceWidth={12}
          preferenceHeight={12}
        />
      </div>

      {isBot ? (
        <div className={s.historyList} style={{ alignContent: "center" }}>
          <div className={s.historyEmpty}>
            <Bot />
          </div>
        </div>
      ) : isHistoryLoading ? (
        <HistoryLoadingState />
      ) : recentGames.length === 0 ? (
        <div className={s.historyList}>
          <div className={s.historyEmpty}>{noHistoryText}</div>
        </div>
      ) : (
        <div className={s.historyList}>
          {recentGames.map((game) => (
            <HistoryRow key={game.json.gameId} game={game} />
          ))}
        </div>
      )}
    </article>
  );
}

export function TeamRow(props: {
  matchHistoryCount: number;
  showBots: boolean;
  slots: PlayerSlot[];
}) {
  const { matchHistoryCount, showBots, slots } = props;
  const { t } = useTranslation();

  const visibleSlots = showBots
    ? slots
    : slots.filter((slot) => !isBotSlot(slot));
  const teamCols = Math.max(5, visibleSlots.length);
  const noDataText = t("ongoingGame.noData", {
    defaultValue: "No player data yet",
  });

  return (
    <section className={s.teamSection}>
      <div
        className={s.teamRow}
        style={assignInlineVars({
          [s.teamColsVar]: String(teamCols),
        })}
      >
        {visibleSlots.length === 0 ? (
          <div className={s.emptyState}>{noDataText}</div>
        ) : (
          visibleSlots.map((slot) => (
            <SnapshotPlayerCard
              key={`slot:${slot.team}:${slot.cellId}:${slot.puuid}`}
              matchHistoryCount={matchHistoryCount}
              slot={slot}
            />
          ))
        )}
      </div>
    </section>
  );
}
