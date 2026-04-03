import { assignInlineVars } from "@vanilla-extract/dynamic";
import { useTranslation } from "react-i18next";
import { isBotSlot } from "../routes/ongoing-game.player-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import * as s from "./OngoingGameCards.css.ts";
import { SnapshotPlayerCard } from "./SnapshotPlayerCard.tsx";

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
