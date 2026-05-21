/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import { useSolidOpenHistoryTab } from "@/features/history/hooks/use-open-history-tab";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import * as s from "./OngoingGameCards.css.ts";
import type { PlayerSquadAssignment } from "./player-card-squads.ts";
import { SnapshotPlayerCardHeader } from "./SnapshotPlayerCardHeader";
import { SnapshotPlayerCardHistory } from "./SnapshotPlayerCardHistory";
import { useSolidSnapshotPlayerCardState } from "./use-snapshot-player-card-state";

export function SnapshotPlayerCard(props: {
  enabledPlayerCardTagIds: readonly string[];
  playerCardTagColors: Readonly<Record<string, string>>;
  squadAssignment?: PlayerSquadAssignment;
  slot: PlayerSlot;
  matchHistoryCount: number;
}): JSX.Element {
  const openHistoryTab = useSolidOpenHistoryTab();
  const cardState = useSolidSnapshotPlayerCardState({
    enabledPlayerCardTagIds: () => props.enabledPlayerCardTagIds,
    matchHistoryCount: () => props.matchHistoryCount,
    playerCardTagColors: () => props.playerCardTagColors,
    slot: () => props.slot,
    squadAssignment: () => props.squadAssignment,
  });
  const playerCardStyle = createMemo(() => {
    const squadTag = cardState.squadTag();
    return squadTag
      ? assignInlineVars({
          [s.playerCardSquadColorVar]: squadTag.color,
        })
      : undefined;
  });
  const handleOpenHistory = () => {
    const historyPuuid = cardState.historyPuuid();
    if (historyPuuid) {
      openHistoryTab(historyPuuid);
    }
  };
  const playerTags = keyArray(
    cardState.playerTags,
    (tag) => tag.id,
    (tag) => (
      <span
        class={s.playerTag}
        style={assignInlineVars({
          [s.playerTagColorVar]: tag().color,
        })}
      >
        {tag().text}
      </span>
    ),
  );

  return (
    <article class={s.playerCard} style={playerCardStyle()}>
      <SnapshotPlayerCardHeader
        championId={cardState.championId()}
        identity={cardState.identity()}
        isBot={cardState.isBot()}
        level={cardState.level()}
        onOpenHistory={cardState.historyPuuid() ? handleOpenHistory : undefined}
        rankItems={cardState.rankItems()}
        showRank={cardState.showRank()}
        squadTag={cardState.squadTag()}
      />

      <div class={s.playerOverview}>
        <div class={s.playerStats}>
          <span
            class={s.winRateText({
              tone: cardState.winRateStat().tone,
            })}
          >
            {cardState.winRateStat().text}
          </span>
        </div>
        <Show when={cardState.playerTags().length > 0}>
          <div class={s.playerTagList}>{playerTags()}</div>
        </Show>
      </div>

      <SnapshotPlayerCardHistory
        hasHistoryLoadFailed={cardState.hasHistoryLoadFailed()}
        historyLoadFailedText={cardState.historyLoadFailedText()}
        isBot={cardState.isBot()}
        isHistoryLoading={cardState.isHistoryLoading()}
        noHistoryText={cardState.noHistoryText()}
        recentGames={cardState.recentGames()}
      />
    </article>
  );
}
