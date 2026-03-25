import { assignInlineVars } from "@vanilla-extract/dynamic";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useTranslation } from "react-i18next";
import { SkeletonTheme } from "react-loading-skeleton";
import type {
  OngoingGamePlayerSnapshot,
  PlayerSlot,
} from "@/bindings/ongoing_game";
import { vars } from "@/styles/theme.css";
import * as s from "../OngoingGameRoute.css";
import {
  formatDuration,
  historyResultClassName,
  historyResultLabel,
  toRecentGames,
} from "../ongoing-game.history-utils";
import {
  formatName,
  formatRank,
  toTeamCardEntries,
} from "../ongoing-game.player-utils";
import type {
  MatchHistoryModeContext,
  RecentGameSummary,
  TeamCardEntry,
} from "../ongoing-game.types";
import { ChampionAvatar, HistoryChampionAvatar } from "./OngoingGameAvatars";

function HistoryRow(props: {
  game: RecentGameSummary;
  csLabel: string;
  t: (key: string, options?: { defaultValue?: string }) => string;
}) {
  const { game, csLabel, t } = props;

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
        {csLabel} {game.cs} · {formatDuration(game.durationSec)}
      </span>
    </div>
  );
}

function PlayerHistory(props: {
  rows: RecentGameSummary[];
  noHistoryText: string;
  csLabel: string;
  t: (key: string, options?: { defaultValue?: string }) => string;
}) {
  const { rows, noHistoryText, csLabel, t } = props;

  if (rows.length === 0) {
    return <div className={s.historyEmpty}>{noHistoryText}</div>;
  }

  return rows.map((game) => (
    <HistoryRow key={game.gameId} game={game} csLabel={csLabel} t={t} />
  ));
}

function SlotCard(props: {
  card: Extract<TeamCardEntry, { kind: "slot" }>;
  levelText: string;
  recentGamesText: string;
  noRankedText: string;
  botNoHistoryText: string;
}) {
  const { card, levelText, recentGamesText, noRankedText, botNoHistoryText } =
    props;

  if (!card.isBot) {
    return (
      <SkeletonTheme
        baseColor={`color-mix(in oklch, ${vars.color.foreground} 8%, transparent)`}
        highlightColor={`color-mix(in oklch, ${vars.color.foreground} 16%, transparent)`}
        duration={1.2}
      >
        <article key={card.key} className={s.playerCard}>
          <div className={s.playerHeader}>
            <ChampionAvatar championId={card.slot.champion_id} />
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

  return (
    <article key={card.key} className={s.playerCard}>
      <div className={s.playerHeader}>
        <ChampionAvatar championId={card.slot.champion_id} />
        <div className={s.playerName}>BOT</div>
      </div>
      <div className={s.playerMeta}>
        <span>{levelText}: -</span>
        <span>{recentGamesText}: -</span>
      </div>
      <div className={s.playerStats}>{noRankedText}</div>
      <div className={s.historyList}>
        <div className={s.historyEmpty}>{botNoHistoryText}</div>
      </div>
    </article>
  );
}

function SnapshotPlayerCard(props: {
  card: Extract<TeamCardEntry, { kind: "player" }>;
  modeContext: MatchHistoryModeContext;
  levelText: string;
  recentGamesText: string;
  noRankedText: string;
  noHistoryText: string;
  botNoHistoryText: string;
  csText: string;
}) {
  const {
    card,
    modeContext,
    levelText,
    recentGamesText,
    noRankedText,
    noHistoryText,
    botNoHistoryText,
    csText,
  } = props;
  const { t } = useTranslation();

  const player = card.player;
  const rank = formatRank(player);
  const level = player.summoner.summonerLevel || 0;
  const recentGameRows = card.isBot ? [] : toRecentGames(player, modeContext);
  const recentGames = card.isBot ? 0 : recentGameRows.length;

  return (
    <article key={card.key} className={s.playerCard}>
      <div className={s.playerHeader}>
        <ChampionAvatar championId={card.championId} />
        <div className={s.playerName}>
          {card.isBot ? "BOT" : formatName(player)}
        </div>
      </div>
      <div className={s.playerMeta}>
        <span>
          {levelText}: {level}
        </span>
        <span>
          {recentGamesText}: {recentGames}
        </span>
      </div>
      <div className={s.playerStats}>{rank || noRankedText}</div>
      <div className={s.historyList}>
        {card.isBot ? (
          <div className={s.historyEmpty}>{botNoHistoryText}</div>
        ) : (
          <PlayerHistory
            rows={recentGameRows}
            noHistoryText={noHistoryText}
            csLabel={csText}
            t={t}
          />
        )}
      </div>
    </article>
  );
}

export function TeamRow(props: {
  title: string;
  titleClassName: string;
  showBots: boolean;
  players: OngoingGamePlayerSnapshot[];
  slots: PlayerSlot[];
  modeContext: MatchHistoryModeContext;
  noDataText: string;
  noRankedText: string;
  recentGamesText: string;
  noHistoryText: string;
  botNoHistoryText: string;
  csText: string;
  levelText: string;
}) {
  const {
    showBots,
    players,
    slots,
    modeContext,
    noDataText,
    noRankedText,
    recentGamesText,
    noHistoryText,
    botNoHistoryText,
    csText,
    levelText,
  } = props;

  const cardEntries = toTeamCardEntries(players, slots);
  const visibleCards = showBots
    ? cardEntries
    : cardEntries.filter((card) => !card.isBot);
  const teamCols = Math.max(5, visibleCards.length);

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
          visibleCards.map((card) => {
            if (card.kind === "slot") {
              return (
                <SlotCard
                  key={card.key}
                  card={card}
                  levelText={levelText}
                  recentGamesText={recentGamesText}
                  noRankedText={noRankedText}
                  botNoHistoryText={botNoHistoryText}
                />
              );
            }

            return (
              <SnapshotPlayerCard
                key={card.key}
                card={card}
                modeContext={modeContext}
                levelText={levelText}
                recentGamesText={recentGamesText}
                noRankedText={noRankedText}
                noHistoryText={noHistoryText}
                botNoHistoryText={botNoHistoryText}
                csText={csText}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
