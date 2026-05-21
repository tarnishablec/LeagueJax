/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { normalizeTeamId } from "../../routes/ongoing-game.player-utils.ts";
import { TeamRow } from "../OngoingGameCards";
import * as s from "./FiveVsFiveOngoingLayout.css.ts";
import type { OngoingLayoutProps } from "./OngoingLayout.types.ts";

export function FiveVsFiveOngoingLayout(
  props: OngoingLayoutProps,
): JSX.Element {
  const shouldOffsetSingleRedTeam = () =>
    props.teamGroups.length === 1 &&
    normalizeTeamId(props.teamGroups[0]?.teamId ?? 0) === 2;
  const teamRows = keyArray(
    () => props.teamGroups,
    (group) => String(normalizeTeamId(group.teamId)),
    (group) => (
      <TeamRow
        enabledPlayerCardTagIds={props.enabledPlayerCardTagIds}
        matchHistoryCount={props.matchHistoryCount}
        minimumColumns={5}
        playerCardTagColors={props.playerCardTagColors}
        showBots={props.showBots}
        squadAssignments={props.squadAssignments}
        slots={group().members}
      />
    ),
  );

  return (
    <div class={s.page}>
      <Show when={shouldOffsetSingleRedTeam()}>
        <div class={s.rowSpacer} />
      </Show>
      {teamRows()}
    </div>
  );
}
