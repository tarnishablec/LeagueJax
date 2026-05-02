import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { useTranslation } from "react-i18next";
import type { RankEntry } from "@/bindings/rank.ts";
import { useRankIcon } from "@/hooks/use-rank-icon.ts";
import {
  formatRankEntryMiniLabel,
  formatRankTierShortLabel,
  hasRankEntry,
  resolveRankTierForIcon,
} from "@/utils/rank-display";
import * as s from "./MiniRankDisplay.css";

export function MiniRankDisplay({
  entry,
  className,
  lpLabel = "LP",
  showUnrankedText = false,
}: {
  entry: RankEntry | null | undefined;
  className?: string;
  lpLabel?: string;
  showUnrankedText?: boolean;
}) {
  const { t } = useTranslation();
  const isRanked = hasRankEntry(entry);
  const iconUrl = useRankIcon(resolveRankTierForIcon(entry), true);
  const text = formatRankEntryMiniLabel(t, entry, lpLabel, {
    showUnranked: showUnrankedText,
  });
  const tooltipText = isRanked
    ? formatRankEntryMiniLabel(t, entry, lpLabel, { showUnranked: true })
    : formatRankTierShortLabel(t, "NONE");

  return (
    <Tooltip.Root
      lazyMount
      unmountOnExit
      openDelay={150}
      closeDelay={0}
      positioning={{ placement: "top", gutter: 6 }}
    >
      <Tooltip.Trigger asChild>
        <span className={className ? `${s.root} ${className}` : s.root}>
          <img src={iconUrl} alt="" className={s.icon({ ranked: isRanked })} />
          {text ? <span className={s.text}>{text}</span> : null}
        </span>
      </Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner className={s.tooltipPositioner}>
          <Tooltip.Content className={s.tooltipContent}>
            {tooltipText}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}
