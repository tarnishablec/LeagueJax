/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { RankEntry } from "@/bindings/rank.ts";
import { useRankIcon as getRankIconUrl } from "@/hooks/use-rank-icon.ts";
import { useSolidTranslation } from "@/i18n/solid";
import {
  formatRankEntryMiniLabel,
  formatRankTierShortLabel,
  hasRankEntry,
  resolveRankTierForIcon,
} from "@/utils/rank-display";
import * as s from "./MiniRankDisplay.css";

export function MiniRankDisplay(props: {
  entry: RankEntry | null | undefined;
  className?: string;
  lpLabel?: string;
  showUnrankedText?: boolean;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const isRanked = () => hasRankEntry(props.entry);
  const iconUrl = () =>
    getRankIconUrl(resolveRankTierForIcon(props.entry), true);
  const text = () =>
    formatRankEntryMiniLabel(t, props.entry, props.lpLabel ?? "LP", {
      showUnranked: props.showUnrankedText,
    });
  const tooltipText = () =>
    isRanked()
      ? formatRankEntryMiniLabel(t, props.entry, props.lpLabel ?? "LP", {
          showUnranked: true,
        })
      : formatRankTierShortLabel(t, "NONE");

  return (
    <Tooltip.Root
      lazyMount
      unmountOnExit
      openDelay={150}
      closeDelay={0}
      positioning={{ placement: "top", gutter: 6 }}
    >
      <Tooltip.Trigger
        asChild={(getTriggerProps) => (
          <span
            {...getTriggerProps({
              class: props.className ? `${s.root} ${props.className}` : s.root,
            })}
          >
            <img
              src={iconUrl()}
              alt=""
              class={s.icon({ ranked: isRanked() })}
            />
            <Show when={text().length > 0}>
              <span class={s.text}>{text()}</span>
            </Show>
          </span>
        )}
      />
      <Portal>
        <Tooltip.Positioner class={s.tooltipPositioner}>
          <Tooltip.Content class={s.tooltipContent}>
            {tooltipText()}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}
