import { assignInlineVars } from "@vanilla-extract/dynamic";
import { useTranslation } from "react-i18next";
import { isBotSlot } from "../routes/ongoing-game.player-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import * as s from "./OngoingGameCards.css.ts";
import type { PlayerSquadAssignments } from "./player-card-squads.ts";
import { SnapshotPlayerCard } from "./SnapshotPlayerCard.tsx";

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
  excellentKdaThreshold: number;
  matchHistoryCount: number;
  playerCardTagColors: Readonly<Record<string, string>>;
  showBots: boolean;
  squadAssignments: PlayerSquadAssignments;
  slots: PlayerSlot[];
}) {
  const {
    enabledPlayerCardTagIds,
    excellentKdaThreshold,
    matchHistoryCount,
    playerCardTagColors,
    showBots,
    squadAssignments,
    slots,
  } = props;
  const { t } = useTranslation();

  const visibleSlots = showBots
    ? slots
    : slots.filter((slot) => !isBotSlot(slot));
  const teamCols = Math.max(5, visibleSlots.length);
  const noDataText = t("ongoingGame.noData", {
    defaultValue: "No player data yet",
  });

  return (
    <div className={s.teamSection}>
      <div className={s.teamSectionContent}>
        <div
          className={s.teamRow}
          style={assignInlineVars({
            [s.teamColsVar]: String(teamCols),
          })}
        >
          {visibleSlots.length === 0 ? (
            <div className={s.emptyState}>{noDataText}</div>
          ) : (
            visibleSlots.map((slot, index) => (
              <SnapshotPlayerCard
                key={getSlotKey(slot, index)}
                enabledPlayerCardTagIds={enabledPlayerCardTagIds}
                excellentKdaThreshold={excellentKdaThreshold}
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
