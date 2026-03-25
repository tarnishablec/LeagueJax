import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import * as s from "./MatchCard.css";
import { formatDamage } from "./match-card-display";

export function MatchCardMetrics({
  me,
  gameDuration,
  damageShare,
  csShort,
  csPerMinLabel,
  damageLabel,
  damageShareLabel,
}: {
  me: RawMatchSummaryParticipant;
  gameDuration: number;
  damageShare: number;
  csShort: string;
  csPerMinLabel: string;
  damageLabel: string;
  damageShareLabel: string;
}) {
  const csTotal = me.totalMinionsKilled + me.neutralMinionsKilled;
  const kdaText =
    (me.deaths ?? 0) === 0
      ? "Perfect"
      : (((me.kills ?? 0) + (me.assists ?? 0)) / (me.deaths ?? 1)).toFixed(2);
  const csPerMin =
    gameDuration > 0 ? (csTotal / (gameDuration / 60)).toFixed(1) : "0.0";

  return (
    <div className={s.metricRow}>
      <div className={s.metricGroup}>
        <span className={s.metricPrimary}>
          {me.kills ?? 0}/{me.deaths ?? 0}/{me.assists ?? 0}
        </span>
        <span className={s.metricSecondary}>KDA {kdaText}</span>
      </div>
      <div className={s.metricGroup}>
        <span className={s.metricPrimary}>
          {csShort} {new Intl.NumberFormat().format(csTotal)}
        </span>
        <span className={s.metricSecondary}>
          {csPerMinLabel} {csPerMin}
        </span>
      </div>
      <div className={s.metricGroup}>
        <span className={s.metricPrimary}>
          {damageLabel} {formatDamage(me.totalDamageDealtToChampions)}
        </span>
        <span className={s.metricSecondary}>
          {damageShareLabel} {`${(damageShare * 100).toFixed(1)}%`}
        </span>
      </div>
    </div>
  );
}
