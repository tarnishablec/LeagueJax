import { Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { useLcuQueueName } from "@/hooks/use-lcu-queues.ts";
import { vars } from "@/styles/theme.css.ts";
import {
  historyResultClassName,
  historyResultLabel,
  resolveRecentGameResult,
} from "../routes/ongoing-game.history-utils.ts";
import type { EnrichedMatch } from "./use-snapshot-player-card-state.ts";
import * as s from "./OngoingGameCards.css.ts";

function formatGameTime(epochMs: number): string {
  const d = new Date(epochMs);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
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
        <Skeleton width="100%" height={35} borderRadius={6} />
        <Skeleton width="100%" height={35} borderRadius={6} />
        <Skeleton width="100%" height={35} borderRadius={6} />
        <Skeleton width="100%" height={35} borderRadius={6} />
        <Skeleton width="100%" height={35} borderRadius={6} />
      </div>
    </SkeletonTheme>
  );
}

function SnapshotPlayerCardHistoryList(props: { recentGames: EnrichedMatch[] }) {
  const { recentGames } = props;

  return (
    <div className={s.historyList}>
      {recentGames.map((game) => (
        <HistoryRow key={game.json.gameId} game={game} />
      ))}
    </div>
  );
}

type SnapshotPlayerCardHistoryProps = {
  hasHistoryLoadFailed: boolean;
  historyLoadFailedText: string;
  isBot: boolean;
  isHistoryLoading: boolean;
  noHistoryText: string;
  recentGames: EnrichedMatch[];
};

export function SnapshotPlayerCardHistory(
  props: SnapshotPlayerCardHistoryProps,
) {
  const {
    hasHistoryLoadFailed,
    historyLoadFailedText,
    isBot,
    isHistoryLoading,
    noHistoryText,
    recentGames,
  } = props;

  if (isBot) {
    return (
      <div className={s.historyList} style={{ alignContent: "center" }}>
        <div className={s.historyEmpty}>
          <Bot />
        </div>
      </div>
    );
  }

  if (isHistoryLoading) {
    return <HistoryLoadingState />;
  }

  if (hasHistoryLoadFailed) {
    return (
      <div className={s.historyList}>
        <div className={s.historyEmpty}>{historyLoadFailedText}</div>
      </div>
    );
  }

  if (recentGames.length === 0) {
    return (
      <div className={s.historyList}>
        <div className={s.historyEmpty}>{noHistoryText}</div>
      </div>
    );
  }

  return <SnapshotPlayerCardHistoryList recentGames={recentGames} />;
}
