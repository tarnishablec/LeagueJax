/** @jsxImportSource solid-js */
import type { JSX } from "solid-js";
import * as s from "./MatchCardMetrics.css";

export function MatchCardKdaRecord(props: {
  kills: number;
  deaths: number;
  assists: number;
}): JSX.Element {
  return (
    <span class={s.kdaRecord} style={{ "text-box-trim": "trim-both" }}>
      <span>{props.kills}</span>
      <span class={s.kdaSeparator}>/</span>
      <span class={s.kdaDeaths}>{props.deaths}</span>
      <span class={s.kdaSeparator}>/</span>
      <span>{props.assists}</span>
    </span>
  );
}
