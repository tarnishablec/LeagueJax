/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import type { JSX } from "solid-js";
import { TeamRow } from "../OngoingGameCards";
import * as s from "./MultiTeamOngoingLayout.css.ts";
import type { OngoingLayoutProps } from "./OngoingLayout.types.ts";

export function MultiTeamOngoingLayout(props: OngoingLayoutProps): JSX.Element {
  const teamRows = keyArray(
    () => props.teamGroups,
    (group) => String(group.teamId),
    (group) => (
      <div class={s.teamGroup}>
        <TeamRow
          enabledPlayerCardTagIds={props.enabledPlayerCardTagIds}
          layout="compact"
          matchHistoryCount={props.matchHistoryCount}
          minimumColumns={1}
          playerCardTagColors={props.playerCardTagColors}
          showBots={props.showBots}
          squadAssignments={props.squadAssignments}
          slots={group().members}
        />
      </div>
    ),
  );

  return <div class={s.page}>{teamRows()}</div>;
}
