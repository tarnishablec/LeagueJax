import { assignInlineVars } from "@vanilla-extract/dynamic";
import { memo } from "react";
import { useNavigate } from "react-router";
import { useTabStore } from "@/stores/tabs";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import * as s from "./OngoingGameCards.css.ts";
import type { PlayerSquadAssignment } from "./player-card-squads.ts";
import { SnapshotPlayerCardHeader } from "./SnapshotPlayerCardHeader.tsx";
import { SnapshotPlayerCardHistory } from "./SnapshotPlayerCardHistory.tsx";
import { useSnapshotPlayerCardState } from "./use-snapshot-player-card-state.ts";

export const SnapshotPlayerCard = memo(function SnapshotPlayerCard(props: {
  enabledPlayerCardTagIds: readonly string[];
  playerCardTagColors: Readonly<Record<string, string>>;
  squadAssignment?: PlayerSquadAssignment;
  slot: PlayerSlot;
  matchHistoryCount: number;
}) {
  const {
    enabledPlayerCardTagIds,
    playerCardTagColors,
    squadAssignment,
    slot,
    matchHistoryCount,
  } = props;
  const navigate = useNavigate();
  const openTab = useTabStore((state) => state.openTab);
  const cardState = useSnapshotPlayerCardState(
    slot,
    matchHistoryCount,
    enabledPlayerCardTagIds,
    playerCardTagColors,
    squadAssignment,
  );
  const playerCardStyle = cardState.squadTag
    ? assignInlineVars({
        [s.playerCardSquadColorVar]: cardState.squadTag.color,
      })
    : undefined;
  const historyPuuid = cardState.historyPuuid;
  const handleOpenHistory = historyPuuid
    ? () => {
        openTab(historyPuuid);
        void navigate("/main/history");
      }
    : undefined;

  return (
    <article className={s.playerCard} style={playerCardStyle}>
      <SnapshotPlayerCardHeader
        championId={cardState.championId}
        identity={cardState.identity}
        isBot={cardState.isBot}
        level={cardState.level}
        onOpenHistory={handleOpenHistory}
        rankItems={cardState.rankItems}
        showRank={cardState.showRank}
        squadTag={cardState.squadTag}
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
