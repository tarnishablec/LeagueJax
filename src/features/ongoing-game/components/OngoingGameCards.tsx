import { assignInlineVars } from "@vanilla-extract/dynamic";
import { useTranslation } from "react-i18next";
import { shouldRenderSlot } from "../routes/ongoing-game.player-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import * as s from "./OngoingGameCards.css.ts";
import type { PlayerSquadAssignments } from "./player-card-squads.ts";
import { SnapshotPlayerCard } from "./SnapshotPlayerCard.tsx";

type TeamRowLayout = "standard" | "compact";

function getSlotKey(slot: PlayerSlot, index: number): string {
  if (slot.cellId > 0) {
    return `slot:${slot.team}:${slot.cellId}`;
  }

  if (slot.summonerId > 0) {
    return `slot:${slot.team}:summoner:${slot.summonerId}`;
  }

  if (slot.puuid.trim().length > 0) {
    return `slot:${slot.team}:puuid:${slot.puuid}`;
  }

  return `slot:${slot.team}:fallback:${index}`;
}

export function TeamRow(props: {
  enabledPlayerCardTagIds: readonly string[];
  layout?: TeamRowLayout;
  matchHistoryCount: number;
  minimumColumns?: number;
  playerCardTagColors: Readonly<Record<string, string>>;
  showBots: boolean;
  squadAssignments: PlayerSquadAssignments;
  slots: PlayerSlot[];
}) {
  const {
    enabledPlayerCardTagIds,
    layout = "standard",
    matchHistoryCount,
    minimumColumns = 5,
    playerCardTagColors,
    showBots,
    squadAssignments,
    slots,
  } = props;
  const { t } = useTranslation();

  const visibleSlots = slots.filter((slot) => shouldRenderSlot(slot, showBots));
  const teamCols = Math.max(minimumColumns, visibleSlots.length, 1);
  const teamMinWidth = teamCols * 188 + (teamCols - 1) * 8;
  const noDataText = t("ongoingGame.noData", {
    defaultValue: "No player data yet",
  });

  return (
    <div className={s.teamSection({ layout })}>
      <div className={s.teamSectionContent({ layout })}>
        <div
          className={s.teamRow({ layout })}
          style={assignInlineVars({
            [s.teamColsVar]: String(teamCols),
            [s.teamMinWidthVar]: `${teamMinWidth}px`,
          })}
        >
          {visibleSlots.length === 0 ? (
            <div className={s.emptyState}>{noDataText}</div>
          ) : (
            visibleSlots.map((slot, index) => (
              <SnapshotPlayerCard
                key={getSlotKey(slot, index)}
                enabledPlayerCardTagIds={enabledPlayerCardTagIds}
                matchHistoryCount={matchHistoryCount}
                playerCardTagColors={playerCardTagColors}
                squadAssignment={squadAssignments.byPuuid[slot.puuid.trim()]}
                slot={slot}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
