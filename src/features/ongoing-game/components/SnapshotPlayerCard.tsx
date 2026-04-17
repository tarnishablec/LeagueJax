import { memo } from "react";
import { useTranslation } from "react-i18next";
import { LeaguePositionPair } from "@/components/league-position/LeaguePositionIcon.tsx";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import * as s from "./OngoingGameCards.css.ts";
import { SnapshotPlayerCardHeader } from "./SnapshotPlayerCardHeader.tsx";
import { SnapshotPlayerCardHistory } from "./SnapshotPlayerCardHistory.tsx";
import { useSnapshotPlayerCardState } from "./use-snapshot-player-card-state.ts";

export const SnapshotPlayerCard = memo(function SnapshotPlayerCard(props: {
  slot: PlayerSlot;
  matchHistoryCount: number;
}) {
  const { slot, matchHistoryCount } = props;
  const { t } = useTranslation();
  const cardState = useSnapshotPlayerCardState(slot, matchHistoryCount, t);

  return (
    <article className={s.playerCard}>
      <SnapshotPlayerCardHeader
        championId={cardState.championId}
        isBot={cardState.isBot}
        level={cardState.level}
        rankIcon={cardState.rankIcon}
        rankText={cardState.rankText}
        summoner={cardState.summoner}
      />

      <div className={s.playerStats}>
        <span className={s.winRateText({ tone: cardState.winRateStat.tone })}>
          {cardState.winRateStat.text}
        </span>
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
