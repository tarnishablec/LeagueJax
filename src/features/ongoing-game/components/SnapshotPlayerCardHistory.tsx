import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import { Bot } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { LeaguePositionIcon } from "@/components/league-position/LeaguePositionIcon";
import { MatchCard } from "@/features/history/components/match-card/MatchCard";
import { normalizeHistoryPosition } from "@/features/history/hooks/use-match-card-view-model";
import { useLcuQueueName } from "@/hooks/use-lcu-queues.ts";
import { vars } from "@/styles/theme.css.ts";
import {
  historyResultClassName,
  historyResultLabel,
  resolveRecentGameResult,
} from "../routes/ongoing-game.history-utils.ts";
import * as s from "./OngoingGameCards.css.ts";
import type { EnrichedMatch } from "./use-snapshot-player-card-state.ts";

function formatGameTime(epochMs: number): string {
  const d = new Date(epochMs);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

const HistoryRow = memo(function HistoryRow(props: { game: EnrichedMatch }) {
  const { game } = props;
  const { t } = useTranslation();
  const result = resolveRecentGameResult(game);
  const queueName = useLcuQueueName(game.json.queueId);
  const championId = game.me.championId > 0 ? game.me.championId : null;
  const position =
    normalizeHistoryPosition(game.me.teamPosition) ??
    normalizeHistoryPosition(game.me.individualPosition) ??
    normalizeHistoryPosition(game.me.lane);

  return (
    <Dialog.Root lazyMount unmountOnExit closeOnEscape>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={`${s.historyRowButtonReset} ${s.historyRow} ${historyResultClassName(
            result,
            {
              winText: s.winRow,
              loseText: s.loseRow,
              remakeText: s.remakeRow,
              terminatedText: s.terminatedRow,
            },
          )}`}
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
                style={{
                  fontSize: "0.75rem",
                }}
              >
                {historyResultLabel(result, t)}
              </span>
              <span className={s.gameTimeText}>
                {formatGameTime(game.json.gameCreation)}
              </span>
            </div>
          </div>
          <div className={s.kdaCell}>
            <span className={s.kdaText}>
              {game.me.kills ?? 0}/{game.me.deaths ?? 0}/{game.me.assists ?? 0}
            </span>
            {position ? (
              <LeaguePositionIcon position={position} width={14} height={14} />
            ) : (
              <span className={s.positionText}>-</span>
            )}
          </div>
        </button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop className={s.historyDialogBackdrop} />
        <Dialog.Positioner className={s.historyDialogPositioner}>
          <Dialog.Content className={s.historyDialogContent}>
            <MatchCard
              match={game}
              me={game.me}
              sgpServerId={null}
              defaultExpanded
            />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
});

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

function SnapshotPlayerCardHistoryList(props: {
  recentGames: EnrichedMatch[];
}) {
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
  recentGames: EnrichedMatch[];
};

export const SnapshotPlayerCardHistory = memo(
  function SnapshotPlayerCardHistory(props: SnapshotPlayerCardHistoryProps) {
    const {
      hasHistoryLoadFailed,
      historyLoadFailedText,
      isBot,
      isHistoryLoading,
      recentGames,
    } = props;

    if (isBot) {
      return (
        <div className={s.historyCenteredState}>
          <div>
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
        <div className={s.historyCenteredState}>
          <div>{historyLoadFailedText}</div>
        </div>
      );
    }

    if (recentGames.length === 0) {
      return <div className={s.historyBlank} />;
    }

    return <SnapshotPlayerCardHistoryList recentGames={recentGames} />;
  },
);
