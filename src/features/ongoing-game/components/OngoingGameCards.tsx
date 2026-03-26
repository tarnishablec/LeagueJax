import { assignInlineVars } from "@vanilla-extract/dynamic";
import { Pickaxe } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SkeletonTheme } from "react-loading-skeleton";
import type {
  OngoingGamePlayerSnapshot,
  PlayerSlot,
} from "@/bindings/ongoing_game.ts";
import { LeaguePositionPair } from "@/components/league-position/LeaguePositionIcon.tsx";
import { vars } from "@/styles/theme.css.ts";
import * as s from "../routes/OngoingGameRoute.css.ts";
import {
  formatDuration,
  historyResultClassName,
  historyResultLabel,
  toRecentGames,
} from "../routes/ongoing-game.history-utils.ts";
import {
  formatName,
  formatRank,
  toTeamCardEntries,
} from "../routes/ongoing-game.player-utils.ts";
import type {
  MatchHistoryModeContext,
  RecentGameSummary,
  TeamCardEntry,
} from "../routes/ongoing-game.types.ts";
import { useOngoingGameStore } from "../store";
import {
  ChampionAvatar,
  HistoryChampionAvatar,
} from "./OngoingGameAvatars.tsx";

type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

type SnapshotCardModel =
  | {
      variant: "skeleton";
      championId: number | null;
    }
  | {
      variant: "content";
      championId: number | null;
      displayName: string;
      level: number | "-";
      recentGamesLabel: string;
      recentGamesValue: string;
      rankText: string;
      noRankedText: string;
      showPosition: boolean;
      positionAssigned: string | null;
      positionPrimary: string | null;
      positionSecondary: string | null;
      history:
        | {
            kind: "rows";
            rows: RecentGameSummary[];
            noHistoryText: string;
          }
        | {
            kind: "empty";
            text: string;
          };
    };

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

function SnapshotCardSkeleton({ championId }: { championId: number | null }) {
  return (
    <SkeletonTheme
      baseColor={`color-mix(in oklch, ${vars.color.foreground} 8%, transparent)`}
      highlightColor={`color-mix(in oklch, ${vars.color.foreground} 16%, transparent)`}
      duration={1.2}
    >
      <article className={s.playerCard}>
        <div className={s.playerHeader}>
          <ChampionAvatar championId={championId} />
          <Skeleton width="72%" height={16} borderRadius={6} />
        </div>
        <div className={s.playerMeta}>
          <Skeleton width="100%" height={14} borderRadius={6} />
          <Skeleton width="100%" height={14} borderRadius={6} />
        </div>
        <Skeleton width="56%" height={14} borderRadius={6} />
        <div className={s.historyList}>
          <Skeleton width="100%" height={35} borderRadius={6} />
          <Skeleton width="100%" height={35} borderRadius={6} />
          <Skeleton width="100%" height={35} borderRadius={6} />
          <Skeleton width="100%" height={35} borderRadius={6} />
        </div>
      </article>
    </SkeletonTheme>
  );
}

function SnapshotCardContent(props: {
  model: Extract<SnapshotCardModel, { variant: "content" }>;
  t: TranslateFn;
}) {
  const { model, t } = props;

  return (
    <article className={s.playerCard}>
      <div className={s.playerHeader}>
        <div className={s.playerAvatarWrap}>
          <ChampionAvatar championId={model.championId} />
          <span className={s.levelBadge}>{model.level}</span>
        </div>
        <div className={s.playerName}>{model.displayName}</div>
      </div>
      <div className={s.playerMetaSingle}>
        <span>
          {model.recentGamesLabel}: {model.recentGamesValue}
        </span>
      </div>

      <div className={s.playerStats}>
        <div>{model.rankText || model.noRankedText}</div>
        {model.showPosition ? (
          <LeaguePositionPair
            assigned={model.positionAssigned}
            primary={model.positionPrimary}
            secondary={model.positionSecondary}
            assignedWidth={16}
            assignedHeight={16}
            preferenceWidth={12}
            preferenceHeight={12}
          />
        ) : (
          <div></div>
        )}
      </div>

      <div className={s.historyList}>
        {model.history.kind === "rows" ? (
          <PlayerHistory
            rows={model.history.rows}
            noHistoryText={model.history.noHistoryText}
            t={t}
          />
        ) : (
          <div className={s.historyEmpty}>{model.history.text}</div>
        )}
      </div>
    </article>
  );
}

function useSnapshotPlayerCardModel(
  card: TeamCardEntry,
  t: TranslateFn,
): SnapshotCardModel {
  const matchHistoryFilter = useOngoingGameStore(
    (state) => state.matchHistoryFilter,
  );
  const queueId = useOngoingGameStore((state) => state.queueId);
  const mapId = useOngoingGameStore((state) => state.mapId);
  const gameMode = useOngoingGameStore((state) => state.gameMode);

  const modeContext = useMemo<MatchHistoryModeContext>(
    () => ({
      filter: matchHistoryFilter,
      queueId,
      mapId,
      gameMode,
    }),
    [matchHistoryFilter, queueId, mapId, gameMode],
  );

  const showPositionByMode =
    mapId === 11 || (gameMode ?? "").toUpperCase() === "CLASSIC";

  const noRankedText = t("ongoingGame.noRanked", {
    defaultValue: "No ranked data",
  });
  const recentGamesLabel = t("ongoingGame.recentGames", {
    defaultValue: "Recent games",
  });
  const noHistoryText = t("ongoingGame.noHistory", {
    defaultValue: "No match history",
  });
  const botNoHistoryText = t("ongoingGame.botNoHistory", {
    defaultValue: "Bot (history disabled)",
  });

  if (card.kind === "slot" && !card.isBot) {
    return {
      variant: "skeleton",
      championId: card.slot.champion_id,
    };
  }

  const isResolvedPlayer = card.kind === "player" && !card.isBot;
  const championId =
    card.kind === "player" ? card.championId : card.slot.champion_id;
  const displayName = isResolvedPlayer ? formatName(card.player) : "BOT";
  const level = isResolvedPlayer
    ? card.player.summoner.summonerLevel || 0
    : "-";
  const rankText = isResolvedPlayer ? formatRank(card.player) : "";
  const recentGameRows = isResolvedPlayer
    ? toRecentGames(card.player, modeContext)
    : [];
  const recentGamesValue = isResolvedPlayer
    ? String(recentGameRows.length)
    : "-";

  const positionAssigned =
    card.kind === "player"
      ? card.player.position_assigned
      : card.slot.position_assigned;
  const positionPrimary =
    card.kind === "player"
      ? card.player.position_primary
      : card.slot.position_primary;
  const positionSecondary =
    card.kind === "player"
      ? card.player.position_secondary
      : card.slot.position_secondary;

  const showPositionByData = Boolean(
    positionAssigned || positionPrimary || positionSecondary,
  );

  return {
    variant: "content",
    championId,
    displayName,
    level,
    recentGamesLabel,
    recentGamesValue,
    rankText,
    noRankedText,
    showPosition: showPositionByMode || showPositionByData,
    positionAssigned,
    positionPrimary,
    positionSecondary,
    history: isResolvedPlayer
      ? {
          kind: "rows",
          rows: recentGameRows,
          noHistoryText,
        }
      : {
          kind: "empty",
          text: botNoHistoryText,
        },
  };
}

function SnapshotPlayerCard(props: { card: TeamCardEntry }) {
  const { card } = props;
  const { t } = useTranslation();
  const model = useSnapshotPlayerCardModel(card, t);

  if (model.variant === "skeleton") {
    return <SnapshotCardSkeleton championId={model.championId} />;
  }

  return <SnapshotCardContent model={model} t={t} />;
}

export function TeamRow(props: {
  showBots: boolean;
  players: OngoingGamePlayerSnapshot[];
  slots: PlayerSlot[];
}) {
  const { showBots, players, slots } = props;
  const { t } = useTranslation();

  const cardEntries = toTeamCardEntries(players, slots);
  const visibleCards = showBots
    ? cardEntries
    : cardEntries.filter((card) => !card.isBot);
  const teamCols = Math.max(5, visibleCards.length);
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
        {visibleCards.length === 0 ? (
          <div className={s.emptyState}>{noDataText}</div>
        ) : (
          visibleCards.map((card) => (
            <SnapshotPlayerCard key={card.key} card={card} />
          ))
        )}
      </div>
    </section>
  );
}
