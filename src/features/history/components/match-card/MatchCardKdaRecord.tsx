import * as s from "./MatchCardMetrics.css";

export function MatchCardKdaRecord({
  kills,
  deaths,
  assists,
}: {
  kills: number;
  deaths: number;
  assists: number;
}) {
  return (
    <span className={s.kdaRecord} style={{ textBoxTrim: "trim-both" }}>
      <span>{kills}</span>
      <span className={s.kdaSeparator}>/</span>
      <span className={s.kdaDeaths}>{deaths}</span>
      <span className={s.kdaSeparator}>/</span>
      <span>{assists}</span>
    </span>
  );
}
