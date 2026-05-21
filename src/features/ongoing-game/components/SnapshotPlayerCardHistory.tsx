/** @jsxImportSource solid-js */

import { Dialog } from "@ark-ui/solid/dialog";
import { keyArray } from "@solid-primitives/keyed";
import { Bot } from "lucide-solid";
import type { JSX } from "solid-js";
import { For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { LeaguePositionIcon } from "@/components/league-position/LeaguePositionIcon";
import { MatchCard } from "@/features/history/components/match-card";
import { useSolidMatchPerformanceStrategy } from "@/features/history/hooks/use-match-performance-strategy";
import { normalizeHistoryPosition } from "@/features/history/utils/history-position";
import { resolveMatchPerformanceBadgeForMatch } from "@/features/history/utils/match-performance-badge.ts";
import { useSolidLcuQueueName } from "@/hooks/use-lcu-queues";
import { useSolidTranslation } from "@/i18n/solid";
import {
  historyResultClassName,
  historyResultLabel,
  resolveRecentGameResult,
} from "../routes/ongoing-game.history-utils.ts";
import * as s from "./OngoingGameCards.css.ts";
import type { EnrichedMatch } from "./use-snapshot-player-card-state";

const HISTORY_SKELETON_ROW_IDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
] as const;

function formatGameTime(epochMs: number): string {
  const d = new Date(epochMs);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function HistoryRow(props: { game: EnrichedMatch }): JSX.Element {
  const { t } = useSolidTranslation();
  const result = () => resolveRecentGameResult(props.game);
  const queueName = useSolidLcuQueueName(props.game.json.queueId);
  const performanceStrategy = useSolidMatchPerformanceStrategy();
  const performanceBadge = () =>
    resolveMatchPerformanceBadgeForMatch(
      props.game,
      props.game.me,
      result() === "Win",
      performanceStrategy(),
    );
  const championId = () =>
    props.game.me.championId > 0 ? props.game.me.championId : null;
  const supportsPosition = () => {
    const { mapId, gameMode } = props.game.json;
    return mapId === 11 || gameMode.toUpperCase() === "CLASSIC";
  };
  const position = () =>
    supportsPosition()
      ? (normalizeHistoryPosition(props.game.me.teamPosition) ??
        normalizeHistoryPosition(props.game.me.individualPosition) ??
        normalizeHistoryPosition(props.game.me.lane))
      : null;

  return (
    <Dialog.Root lazyMount unmountOnExit closeOnEscape>
      <Dialog.Trigger
        asChild={(getTriggerProps) => (
          <button
            {...getTriggerProps({
              type: "button",
              class: `${s.historyRowButtonReset} ${s.historyRow} ${historyResultClassName(
                result(),
                {
                  winText: s.winRow,
                  loseText: s.loseRow,
                  remakeText: s.remakeRow,
                  terminatedText: s.terminatedRow,
                },
              )}`,
            })}
          >
            <ChampionAvatar
              championId={championId()}
              imageClassName={s.historyChampionAvatar}
              fallbackClassName={s.historyChampionFallback}
            />
            <div class={s.matchBrief}>
              <div class={s.queueNameRow}>
                <span class={s.queueNameText}>{queueName()}</span>
                <Show when={performanceBadge()}>
                  {(badge) => (
                    <span
                      class={s.historyPerformanceBadge({
                        badge: badge(),
                      })}
                    >
                      {badge().toUpperCase()}
                    </span>
                  )}
                </Show>
              </div>
              <div class={s.matchBriefDown}>
                <span
                  class={historyResultClassName(result(), {
                    winText: s.winText,
                    loseText: s.loseText,
                    remakeText: s.remakeText,
                    terminatedText: s.terminatedText,
                  })}
                  style={{
                    "font-size": "0.75rem",
                  }}
                >
                  {historyResultLabel(result(), t)}
                </span>
                <span class={s.gameTimeText}>
                  {formatGameTime(props.game.json.gameCreation)}
                </span>
              </div>
            </div>
            <div class={s.kdaCell}>
              <span class={s.kdaText}>
                {props.game.me.kills ?? 0}/{props.game.me.deaths ?? 0}/
                {props.game.me.assists ?? 0}
              </span>
              <Show when={supportsPosition()}>
                <Show
                  when={position()}
                  fallback={<span class={s.positionText}>-</span>}
                >
                  {(resolvedPosition) => (
                    <LeaguePositionIcon
                      position={resolvedPosition()}
                      width={14}
                      height={14}
                    />
                  )}
                </Show>
              </Show>
            </div>
          </button>
        )}
      />
      <Portal>
        <Dialog.Backdrop class={s.historyDialogBackdrop} />
        <Dialog.Positioner class={s.historyDialogPositioner}>
          <Dialog.Content class={s.historyDialogContent}>
            <div class={s.historyDialogScroller}>
              <div class={s.historyDialogScrollerContent}>
                <MatchCard
                  match={props.game}
                  me={props.game.me}
                  sgpServerId={null}
                  defaultExpanded
                />
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function HistorySkeletonRow(): JSX.Element {
  return (
    <span class={s.historySkeletonRow}>
      <span class={s.historySkeletonBlock} />
    </span>
  );
}

function HistoryLoadingState(): JSX.Element {
  return (
    <div class={s.historyListScroller}>
      <div class={s.historyList}>
        <For each={HISTORY_SKELETON_ROW_IDS}>
          {() => <HistorySkeletonRow />}
        </For>
      </div>
    </div>
  );
}

function SnapshotPlayerCardHistoryList(props: {
  recentGames: EnrichedMatch[];
}): JSX.Element {
  const historyRows = keyArray(
    () => props.recentGames,
    (game) => String(game.json.gameId),
    (game) => <HistoryRow game={game()} />,
  );

  return (
    <div class={s.historyListScroller}>
      <div class={s.historyList}>{historyRows()}</div>
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
): JSX.Element {
  return (
    <Show
      when={!props.isBot}
      fallback={
        <div class={s.historyCenteredState}>
          <div>
            <Bot />
          </div>
        </div>
      }
    >
      <Show when={!props.isHistoryLoading} fallback={<HistoryLoadingState />}>
        <Show
          when={!props.hasHistoryLoadFailed}
          fallback={
            <div class={s.historyCenteredState}>
              <div>{props.historyLoadFailedText}</div>
            </div>
          }
        >
          <Show
            when={props.recentGames.length > 0}
            fallback={
              <div class={s.historyCenteredState}>
                <div>{props.noHistoryText}</div>
              </div>
            }
          >
            <SnapshotPlayerCardHistoryList recentGames={props.recentGames} />
          </Show>
        </Show>
      </Show>
    </Show>
  );
}
