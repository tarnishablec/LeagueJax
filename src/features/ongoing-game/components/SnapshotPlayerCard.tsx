import { assignInlineVars } from "@vanilla-extract/dynamic";
import { memo } from "react";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import * as s from "./OngoingGameCards.css.ts";
import { SnapshotPlayerCardHeader } from "./SnapshotPlayerCardHeader.tsx";
import { SnapshotPlayerCardHistory } from "./SnapshotPlayerCardHistory.tsx";
import { useSnapshotPlayerCardState } from "./use-snapshot-player-card-state.ts";

export const SnapshotPlayerCard = memo(function SnapshotPlayerCard(props: {
  enabledPlayerCardTagIds: readonly string[];
  playerCardTagColors: Readonly<Record<string, string>>;
  slot: PlayerSlot;
  matchHistoryCount: number;
}) {
  const {
    enabledPlayerCardTagIds,
    playerCardTagColors,
    slot,
    matchHistoryCount,
  } = props;
  const cardState = useSnapshotPlayerCardState(
    slot,
    matchHistoryCount,
    enabledPlayerCardTagIds,
    playerCardTagColors,
  );

  return (
    <article className={s.playerCard}>
      <SnapshotPlayerCardHeader
        championId={cardState.championId}
        identity={cardState.identity}
        isBot={cardState.isBot}
        level={cardState.level}
        rankIcon={cardState.rankIcon}
        rankText={cardState.rankText}
        showRank={cardState.showRank}
      />

      <div className={s.playerOverview}>
        <div className={s.playerStats}>
          <span
            className={s.winRateText({
              tone: cardState.winRateStat.tone,
            })}
          >
            {cardState.winRateStat.text}
          </span>
          <span className={s.averageKdaText}>{cardState.averageKdaText}</span>
        </div>
        {cardState.playerTags.length > 0 ? (
          <div className={s.playerTagList}>
            {cardState.playerTags.map((tag) => (
              <span
                key={tag.id}
                className={s.playerTag}
                style={assignInlineVars({
                  [s.playerTagColorVar]: tag.color,
                })}
              >
                {tag.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <SnapshotPlayerCardHistory
        hasHistoryLoadFailed={cardState.hasHistoryLoadFailed}
        historyLoadFailedText={cardState.historyLoadFailedText}
        isBot={cardState.isBot}
        isHistoryLoading={cardState.isHistoryLoading}
        noHistoryText={cardState.noHistoryText}
        recentGames={cardState.recentGames}
      />
    </article>
  );
});
