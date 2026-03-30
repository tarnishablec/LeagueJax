import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { useTranslation } from "react-i18next";
import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { ScoreboardIcon } from "@/components/ScoreboardIcon.tsx";
import * as s from "./MatchCardMetrics.css";

export function MatchCardMetrics({
  me,
  gameDuration,
  damageShare,
}: {
  me: RawMatchSummaryParticipant;
  gameDuration: number;
  damageShare: number;
}) {
  const { t } = useTranslation();
  const csTotal = me.totalMinionsKilled + me.neutralMinionsKilled;
  const kdaText =
    (me.deaths ?? 0) === 0
      ? "Perfect"
      : (((me.kills ?? 0) + (me.assists ?? 0)) / (me.deaths ?? 1)).toFixed(2);
  const csPerMin = (csTotal / (gameDuration / 60)).toFixed(1);
  const goldEarned = Math.max(0, me.goldEarned ?? 0);
  const damageShareText = `${(Math.max(0, Number.isFinite(damageShare) ? damageShare : 0) * 100).toFixed(1)}%`;
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
        <Tooltip.Root openDelay={200} closeDelay={0}>
          <Tooltip.Trigger asChild>
            <span className={s.metricSecondary}>{damageShareText}</span>
          </Tooltip.Trigger>
          <Portal>
            <Tooltip.Positioner className={s.tooltipPositioner}>
              <Tooltip.Content className={s.tooltipContent}>
                {t("history.match.damageShare")}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Portal>
        </Tooltip.Root>
      </div>
    </div>
  );
}
