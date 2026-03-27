import { invoke } from "@tauri-apps/api/core";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { Pickaxe } from "lucide-react";
import { useMemo } from "react";
import "react-loading-skeleton/dist/skeleton.css";
import { useTranslation } from "react-i18next";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import useSWR from "swr";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { LeaguePositionPair } from "@/components/league-position/LeaguePositionIcon.tsx";
import {
  type MatchModeTag,
  useMatchHistory,
} from "@/features/history/hooks/use-match-history.ts";
import { useRankedSummary } from "@/features/history/hooks/use-ranked-summary.ts";
import { vars } from "@/styles/theme.css.ts";
import * as s from "../routes/OngoingGameRoute.css.ts";
import {
  formatDuration,
  historyResultClassName,
  historyResultLabel,
  toRecentGames,
} from "../routes/ongoing-game.history-utils.ts";
import {
  formatRank,
  formatSlotName,
  isBotSlot,
} from "../routes/ongoing-game.player-utils.ts";
import type {
  MatchHistoryModeContext,
  PlayerSlot,
  RecentGameSummary,
} from "../routes/ongoing-game.types.ts";
import { useOngoingGameStore } from "../store";
import {
  ChampionAvatar,
  HistoryChampionAvatar,
} from "./OngoingGameAvatars.tsx";

type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

function useOngoingSummoner(puuid: string | undefined, enabled: boolean) {
  return useSWR(
    enabled && puuid ? ["ongoing-game:get_summoner_by_puuid", puuid] : null,
    ([, resolvedPuuid]) =>
      invoke<SummonerInfo>("get_summoner_by_puuid", {
        puuid: resolvedPuuid,
      }),
    {
      dedupingInterval: 30_000,
    },
  );
}

function normalizeMatchModeTag(context: MatchHistoryModeContext): MatchModeTag {
  if (context.filter === "All") {
    return "all";
  }

  switch (context.queueId) {
    case 420:
      return "q_420";
    case 430:
      return "q_430";
    case 440:
      return "q_440";
    case 450:
      return "q_450";
    case 480:
      return "q_480";
    case 490:
      return "q_490";
    case 900:
      return "q_900";
    case 1700:
      return "q_1700";
    case 1900:
      return "q_1900";
    case 2300:
      return "q_2300";
    default:
      return "all";
  }
}

function resolveQueueIdFromSessions(
  gameflowSession: ReturnType<
    typeof useOngoingGameStore.getState
  >["gameflowSession"],
  champSelectSession: ReturnType<
    typeof useOngoingGameStore.getState
  >["champSelectSession"],
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

function resolveMapIdFromSessions(
  gameflowSession: ReturnType<
    typeof useOngoingGameStore.getState
  >["gameflowSession"],
): number | null {
  const mapId =
    gameflowSession?.map.id ?? gameflowSession?.gameData.queue.mapId;
  if (typeof mapId === "number" && mapId > 0) {
    return mapId;
  }
  return null;
}

function resolveGameModeFromSessions(
  gameflowSession: ReturnType<
    typeof useOngoingGameStore.getState
  >["gameflowSession"],
): string | null {
  const gameMode =
    gameflowSession?.map.gameMode ?? gameflowSession?.gameData.queue.gameMode;
  if (typeof gameMode === "string" && gameMode.trim().length > 0) {
    return gameMode;
  }
  return null;
}

function normalizeChampionId(slot: PlayerSlot): number | null {
  const championId =
    slot.championId > 0 ? slot.championId : slot.championPickIntent;
  return championId > 0 ? championId : null;
}

function HistoryRow(props: { game: RecentGameSummary; t: TranslateFn }) {
  const { game, t } = props;

  return (
    <div className={s.historyRow}>
      <HistoryChampionAvatar championId={game.championId} />
      <span
        className={historyResultClassName(game.result, {
          winText: s.winText,
          loseText: s.loseText,
          remakeText: s.remakeText,
          terminatedText: s.terminatedText,
        })}
      >
        {historyResultLabel(game.result, t)}
      </span>
      <span className={s.kdaText}>
        {game.kills}/{game.deaths}/{game.assists}
      </span>
      <span className={s.historyMeta}>
        <span className={s.historyMetaCs}>
          <Pickaxe className={s.historyMetaIcon} aria-hidden="true" />
          <span>{game.cs}</span>
        </span>
        <span>{formatDuration(game.durationSec)}</span>
      </span>
    </div>
  );
}

function PlayerHistory(props: {
  rows: RecentGameSummary[];
  noHistoryText: string;
  t: TranslateFn;
}) {
  const { rows, noHistoryText, t } = props;

  if (rows.length === 0) {
    return <div className={s.historyEmpty}>{noHistoryText}</div>;
  }

  return rows.map((game) => <HistoryRow key={game.gameId} game={game} t={t} />);
}

function HistoryLoadingState() {
  return (
    <SkeletonTheme
      baseColor={`color-mix(in oklch, ${vars.color.foreground} 8%, transparent)`}
      highlightColor={`color-mix(in oklch, ${vars.color.foreground} 16%, transparent)`}
      duration={1.2}
    >
      <div className={s.historyList}>
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
  const matchHistoryFilter = useOngoingGameStore(
    (state) => state.matchHistoryFilter,
  );
  const gameflowSession = useOngoingGameStore((state) => state.gameflowSession);
  const champSelectSession = useOngoingGameStore(
    (state) => state.champSelectSession,
  );
  const queueId = resolveQueueIdFromSessions(
    gameflowSession,
    champSelectSession,
  );
  const mapId = resolveMapIdFromSessions(gameflowSession);
  const gameMode = resolveGameModeFromSessions(gameflowSession);

  const modeContext = useMemo<MatchHistoryModeContext>(
    () => ({
      filter: matchHistoryFilter,
      queueId,
      mapId,
      gameMode,
    }),
    [gameMode, mapId, matchHistoryFilter, queueId],
  );
  const isBot = isBotSlot(slot);
  const puuid = !isBot && slot.puuid.trim().length > 0 ? slot.puuid : undefined;
  const summonerQuery = useOngoingSummoner(puuid, !isBot);
  const rankedQuery = useRankedSummary(puuid);
  const matchHistoryQuery = useMatchHistory(
    puuid,
    null,
    1,
    matchHistoryCount,
    normalizeMatchModeTag(modeContext),
  );
  const recentGames = useMemo(
    () => toRecentGames(matchHistoryQuery.matches, modeContext),
    [matchHistoryQuery.matches, modeContext],
  );

  const championId = normalizeChampionId(slot);
  const displayName = formatSlotName(slot, summonerQuery.data);
  const level = summonerQuery.data?.summonerLevel || 0;
  const rankText = formatRank(rankedQuery.data);
  const showPositionByMode =
    mapId === 11 || (gameMode ?? "").toUpperCase() === "CLASSIC";
  const showPositionByData = Boolean(slot.assignedPosition);
  const recentGamesLabel = t("ongoingGame.recentGames", {
    defaultValue: "Recent games",
  });
  const noRankedText = t("ongoingGame.noRanked", {
    defaultValue: "No ranked data",
  });
  const noHistoryText = t("ongoingGame.noHistory", {
    defaultValue: "No match history",
  });
  const botNoHistoryText = t("ongoingGame.botNoHistory", {
    defaultValue: "Bot (history disabled)",
  });
  const historyErrorText = t("ongoingGame.noHistory", {
    defaultValue: "No match history",
  });

  return (
    <article className={s.playerCard}>
      <div className={s.playerHeader}>
        <div className={s.playerAvatarWrap}>
          <ChampionAvatar championId={championId} />
          <span className={s.levelBadge}>{level > 0 ? level : "-"}</span>
        </div>
        <div className={s.playerName}>{displayName}</div>
      </div>

      <div className={s.playerMetaSingle}>
        <span>
          {recentGamesLabel}: {isBot ? "-" : String(recentGames.length)}
        </span>
      </div>

      <div className={s.playerStats}>
        <div>{rankText || noRankedText}</div>
        {showPositionByMode || showPositionByData ? (
          <LeaguePositionPair
            assigned={slot.assignedPosition}
            primary={null}
            secondary={null}
            assignedWidth={16}
            assignedHeight={16}
            preferenceWidth={12}
            preferenceHeight={12}
          />
        ) : (
          <div></div>
        )}
      </div>

      {isBot ? (
        <div className={s.historyList}>
          <div className={s.historyEmpty}>{botNoHistoryText}</div>
        </div>
      ) : matchHistoryQuery.isLoading ? (
        <HistoryLoadingState />
      ) : matchHistoryQuery.error ? (
        <div className={s.historyList}>
          <div className={s.historyEmpty}>{historyErrorText}</div>
        </div>
      ) : (
        <div className={s.historyList}>
          <PlayerHistory
            rows={recentGames}
            noHistoryText={noHistoryText}
            t={t}
          />
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
