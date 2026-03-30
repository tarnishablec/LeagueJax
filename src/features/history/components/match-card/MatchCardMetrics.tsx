import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { ScoreboardIcon } from "@/components/ScoreboardIcon.tsx";
import * as s from "./MatchCardMetrics.css";

export function MatchCardMetrics({
  me,
  gameDuration,
}: {
  me: RawMatchSummaryParticipant;
  gameDuration: number;
}) {
  const csTotal = me.totalMinionsKilled + me.neutralMinionsKilled;
  const kdaText =
    (me.deaths ?? 0) === 0
      ? "Perfect"
      : (((me.kills ?? 0) + (me.assists ?? 0)) / (me.deaths ?? 1)).toFixed(2);
  const csPerMin = (csTotal / (gameDuration / 60)).toFixed(1);
  const goldEarned = Math.max(0, me.goldEarned ?? 0);
  const numberFormatter = new Intl.NumberFormat();

  return (
    <div className={s.metricRow}>
      <div className={s.metricGroup}>
        <span className={s.metricPrimaryInline}>
          <span className={s.metricPrimaryText}>
            <span style={{ textBoxTrim: "trim-both" }}>
              {me.kills ?? 0}/{me.deaths ?? 0}/{me.assists ?? 0}
            </span>
          </span>
        </span>
        <span className={s.metricSecondary}>KDA {kdaText}</span>
      </div>
      <div className={s.metricGroup}>
        <span className={s.metricPrimaryInline}>
          <ScoreboardIcon
            type="cs"
            className={s.scoreboardIcon}
            fallbackClassName={s.scoreboardIconFallback}
          />
          <span className={s.metricPrimaryText}>
            <span
              style={{
                textBoxTrim: "trim-both",
              }}
            >
              {numberFormatter.format(csTotal)}
            </span>
          </span>
        </span>
        <span className={s.metricSecondary}>{csPerMin} / min</span>
      </div>
      <div className={s.metricGroup}>
        <span className={s.metricPrimaryInline}>
          <ScoreboardIcon
            type="gold"
            className={s.scoreboardIcon}
            fallbackClassName={s.scoreboardIconFallback}
          />
          <span className={s.metricPrimaryText}>
            <span
              style={{
                textBoxTrim: "trim-both",
              }}
            >
              {numberFormatter.format(goldEarned)}
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
