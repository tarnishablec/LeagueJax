/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import { useSolidTranslation } from "@/i18n/solid";
import {
  normalizeTeamId,
  shouldRenderSlot,
} from "../routes/ongoing-game.player-utils.ts";
import type { PlayerSlot } from "../routes/ongoing-game.types.ts";
import * as s from "./OngoingGameCards.css.ts";
import type { PlayerSquadAssignments } from "./player-card-squads.ts";
import { SnapshotPlayerCard } from "./SnapshotPlayerCard";

type TeamRowLayout = "standard" | "compact";
const PLAYER_CARD_MIN_WIDTH_PX = 220;
const TEAM_CARD_GAP_PX = 8;

function getSlotKey(slot: PlayerSlot, index: number): string {
  const teamId = normalizeTeamId(slot.team);

  if (slot.cellId > 0) {
    return `slot:${teamId}:${slot.cellId}`;
  }

  if (slot.summonerId > 0) {
    return `slot:${teamId}:summoner:${slot.summonerId}`;
  }

  if (slot.puuid.trim().length > 0) {
    return `slot:${teamId}:puuid:${slot.puuid}`;
  }

  return `slot:${teamId}:fallback:${index}`;
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
}): JSX.Element {
  const { t } = useSolidTranslation();
  const layout = () => props.layout ?? "standard";
  const visibleSlots = createMemo(() =>
    props.slots.filter((slot) => shouldRenderSlot(slot, props.showBots)),
  );
  const playerCards = keyArray(visibleSlots, getSlotKey, (slot) => (
    <SnapshotPlayerCard
      enabledPlayerCardTagIds={props.enabledPlayerCardTagIds}
      matchHistoryCount={props.matchHistoryCount}
      playerCardTagColors={props.playerCardTagColors}
      squadAssignment={props.squadAssignments.byPuuid[slot().puuid.trim()]}
      slot={slot()}
    />
  ));
  const teamCols = () =>
    Math.max(props.minimumColumns ?? 5, visibleSlots().length, 1);
  const teamMinWidth = () =>
    teamCols() * PLAYER_CARD_MIN_WIDTH_PX + (teamCols() - 1) * TEAM_CARD_GAP_PX;

  return (
    <div class={s.teamSection({ layout: layout() })}>
      <div class={s.teamSectionContent({ layout: layout() })}>
        <div
          class={s.teamRow({ layout: layout() })}
          style={assignInlineVars({
            [s.teamColsVar]: String(teamCols()),
            [s.teamMinWidthVar]: `${teamMinWidth()}px`,
          })}
        >
          <Show
            when={visibleSlots().length > 0}
            fallback={
              <div class={s.emptyState}>
                {t("ongoingGame.noData", {
                  defaultValue: "No player data yet",
                })}
              </div>
            }
          >
            {playerCards()}
          </Show>
        </div>
      </div>
    </div>
  );
}
