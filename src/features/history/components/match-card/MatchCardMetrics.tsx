/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { RawMatchSummaryParticipant } from "@/bindings/matches.ts";
import { ScoreboardIcon } from "@/components/ScoreboardIcon";
import { useSolidTranslation } from "@/i18n/solid";
import type { MatchPerformanceBadge } from "../../utils/match-performance-badge";
import { MatchCardKdaRecord } from "./MatchCardKdaRecord";
import * as s from "./MatchCardMetrics.css";

export function MatchCardMetrics(props: {
  me: RawMatchSummaryParticipant;
  gameDuration: number;
  damageShare: number;
  damageRank: number;
  goldRank: number;
  performanceBadge?: MatchPerformanceBadge | null;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const csTotal = () =>
    props.me.totalMinionsKilled + props.me.neutralMinionsKilled;
  const kdaText = () =>
    (props.me.deaths ?? 0) === 0
      ? "Perfect"
      : (
          ((props.me.kills ?? 0) + (props.me.assists ?? 0)) /
          (props.me.deaths ?? 1)
        ).toFixed(2);
  const csPerMin = () => (csTotal() / (props.gameDuration / 60)).toFixed(1);
  const goldEarned = () => Math.max(0, props.me.goldEarned ?? 0);
  const damage = () => Math.max(0, props.me.totalDamageDealtToChampions ?? 0);
  const damageShareText = () =>
    `${(Math.max(0, Number.isFinite(props.damageShare) ? props.damageShare : 0) * 100).toFixed(1)}%`;
  const damageShareRankText = () =>
    `${damageShareText()} (#${props.damageRank})`;
  const kdaLabel = () =>
    props.performanceBadge ? props.performanceBadge.toUpperCase() : "KDA";
  const numberFormatter = new Intl.NumberFormat();

  return (
    <div class={s.metricRow}>
      <div class={s.metricGroup}>
        <span class={s.metricPrimaryInline}>
          <span class={s.metricPrimaryText}>
            <MatchCardKdaRecord
              kills={props.me.kills ?? 0}
              deaths={props.me.deaths ?? 0}
              assists={props.me.assists ?? 0}
            />
          </span>
        </span>
        <span class={s.metricSecondary}>
          <Show when={props.performanceBadge} fallback={kdaLabel()}>
            {(badge) => (
              <span class={s.performanceBadge({ badge: badge() })}>
                {kdaLabel()}
              </span>
            )}
          </Show>{" "}
          {kdaText()}
        </span>
      </div>
      <div class={s.divider} />
      <div class={s.metricGroup}>
        <span class={s.metricPrimaryInline}>
          <ScoreboardIcon
            type="cs"
            className={s.scoreboardIcon}
            fallbackClassName={s.scoreboardIconFallback}
          />
          <span class={s.metricPrimaryText}>
            <span style={{ "text-box-trim": "trim-both" }}>
              {numberFormatter.format(csTotal())}
            </span>
          </span>
        </span>
        <span class={s.metricSecondary}>{csPerMin()} / min</span>
      </div>
      <div class={s.divider} />
      <div class={s.metricGroup}>
        <span class={s.metricPrimaryInline}>
          <ScoreboardIcon
            type="gold"
            className={s.scoreboardIcon}
            fallbackClassName={s.scoreboardIconFallback}
          />
          <span class={s.metricPrimaryText}>
            <span style={{ "text-box-trim": "trim-both" }}>
              {numberFormatter.format(goldEarned())}
            </span>
          </span>
        </span>
        <span class={s.metricSecondary}>#{props.goldRank}</span>
      </div>
      <div class={s.divider} />
      <div class={s.metricGroup}>
        <span class={s.metricPrimaryInline}>
          <ScoreboardIcon
            type="damage"
            className={s.scoreboardIcon}
            fallbackClassName={s.scoreboardIconFallback}
          />
          <span class={s.metricPrimaryText}>
            <span style={{ "text-box-trim": "trim-both" }}>
              {numberFormatter.format(damage())}
            </span>
          </span>
        </span>
        <Tooltip.Root openDelay={200} closeDelay={0}>
          <Tooltip.Trigger
            asChild={(getTriggerProps) => (
              <span
                {...getTriggerProps({
                  class: s.metricSecondary,
                })}
              >
                {damageShareRankText()}
              </span>
            )}
          />
          <Portal>
            <Tooltip.Positioner class={s.tooltipPositioner}>
              <Tooltip.Content class={s.tooltipContent}>
                {t("history.match.damageShare")}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Portal>
        </Tooltip.Root>
      </div>
    </div>
  );
}
