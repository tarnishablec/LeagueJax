/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import type { MatchOutcome } from "../../hooks/use-match-card-view-model";
import * as s from "./MatchCard.css";
import { formatDuration } from "./match-card-display";

export function MatchCardHeader(props: {
  gameResult: MatchOutcome;
  outcomeLabel: string;
  placementLabel?: string | null;
  queueName: string;
  mapName: string;
  gameDuration: number;
  startedAt: string;
  durationLabel: string;
  startedAtLabel: string;
}): JSX.Element {
  return (
    <div class={s.headerRow}>
      <Show
        when={props.placementLabel}
        fallback={
          <span class={s.resultPill({ outcome: props.gameResult })}>
            {props.outcomeLabel}
          </span>
        }
      >
        {(placementLabel) => (
          <span class={s.placementPill}>{placementLabel()}</span>
        )}
      </Show>
      <span class={s.metaPill}>{props.queueName}</span>
      <span class={s.metaPill}>{props.mapName}</span>
      <span class={s.metaPill}>
        {props.durationLabel} {formatDuration(props.gameDuration)}
      </span>
      <span class={s.metaPill}>
        {props.startedAtLabel} {props.startedAt}
      </span>
    </div>
  );
}
