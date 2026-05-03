import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RankEntry } from "@/bindings/rank.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { CopyButton } from "@/components/CopyButton";
import { LazyImage } from "@/components/LazyImage.tsx";
import { useCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import { useRankIcon } from "@/hooks/use-rank-icon.ts";
import { formatRankEntryTierLabel } from "@/utils/rank-display";
import { useRankedSummary } from "../hooks/use-ranked-summary";
import * as s from "./SummaryBar.css";

function formatMeta(
  entry: RankEntry | null,
  winsShort: string,
  lpShort: string,
): string {
  if (!entry) {
    return `-- ${winsShort} / -- ${lpShort}`;
  }

  return `${entry.wins}${winsShort} / ${entry.leaguePoints} ${lpShort}`;
}

export function SummaryBar({
  summoner,
  serverLabel,
  autoRefresh = true,
}: {
  summoner: SummonerInfo;
  serverLabel?: string | null;
  autoRefresh?: boolean;
}) {
  const { t } = useTranslation();
  const { src: avatarUrl } = useCdragonStaticData({
    type: "profile-icon",
    profileIconId: summoner.profileIconId,
  });
  const { data: rankedSummary, isLoading: rankedLoading } = useRankedSummary(
    summoner.puuid,
    autoRefresh,
  );
  const summonerId = `${summoner.gameName}#${summoner.tagLine}`;

  const winsShort = t("history.summary.winsShort", { defaultValue: "W" });
  const lpShort = t("history.summary.lpShort", { defaultValue: "LP" });
  const hiddenHistoryText = t("history.summary.hiddenHistory", {
    defaultValue: "Hidden match history",
  });
  const soloRankEntry = rankedSummary?.queueMap.RANKED_SOLO_5x5 ?? null;
  const flexRankEntry = rankedSummary?.queueMap.RANKED_FLEX_SR ?? null;
  const soloIconUrl = useRankIcon(soloRankEntry?.tier ?? "UNRANKED", false);
  const flexIconUrl = useRankIcon(flexRankEntry?.tier ?? "UNRANKED", false);

  return (
    <div className={s.bar}>
      <div className={s.avatarSlot}>
        <div className={s.iconFallback}>
          {avatarUrl ? (
            <LazyImage
              src={avatarUrl}
              alt="Profile icon"
              className={s.profileIcon}
              fallbackClassName={s.iconFallback}
              loadingClassName={s.iconFallback}
            />
          ) : null}
        </div>
      </div>
      <div className={s.identity}>
        <div className={s.nameRow}>
          <span className={s.name}>{summoner.gameName}</span>
          <CopyButton
            text={summonerId}
            className={s.copyButton}
            aria-label={`Copy summoner id ${summonerId}`}
          />
          {summoner.privacy === "PRIVATE" && (
            <Tooltip.Root openDelay={200} closeDelay={0}>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className={s.privacyBadge}
                  aria-label="Hidden match history"
                >
                  <Lock size={12} aria-hidden="true" />
                </button>
              </Tooltip.Trigger>
              <Portal>
                <Tooltip.Positioner className={s.tooltipPositioner}>
                  <Tooltip.Content className={s.tooltipContent}>
                    {hiddenHistoryText}
                  </Tooltip.Content>
                </Tooltip.Positioner>
              </Portal>
            </Tooltip.Root>
          )}
        </div>
        <div className={s.tagRow}>
          <span className={s.tag}>#{summoner.tagLine}</span>
          {serverLabel ? (
            <span className={s.serverBadge}>{serverLabel}</span>
          ) : null}
        </div>
      </div>
      <div className={s.ranks}>
        <div className={s.rankCard}>
          {!rankedLoading && (
            <div className={s.rankCardInner}>
              <div className={s.rankContent}>
                <span className={s.rankQueue}>
                  {t("history.summary.solo", {
                    defaultValue: "Solo/Duo",
                  })}
                </span>
                <span className={s.rankTier}>
                  {formatRankEntryTierLabel(t, soloRankEntry)}
                </span>
                <span className={s.rankMeta}>
                  {formatMeta(soloRankEntry, winsShort, lpShort)}
                </span>
                {/* <span className={s.highestRank}>
                  <span className={s.highestRankLabel}>{highestLabel}</span>
                  <img
                    src={soloHighestIconUrl}
                    alt=""
                    className={s.highestRankIcon}
                  />
                  <span className={s.highestRankText}>
                    {formatRankEntryTierLabel(t, soloHighestRankEntry)}
                  </span>
                </span> */}
              </div>
              <div className={s.rankIconWrap}>
                {soloIconUrl ? (
                  <LazyImage
                    src={soloIconUrl}
                    alt={t("history.summary.solo", {
                      defaultValue: "Solo/Duo",
                    })}
                    className={s.rankIcon}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
        <div className={s.rankCard}>
          {!rankedLoading && (
            <div className={s.rankCardInner}>
              <div className={s.rankContent}>
                <span className={s.rankQueue}>
                  {t("history.summary.flex", {
                    defaultValue: "Flex",
                  })}
                </span>
                <span className={s.rankTier}>
                  {formatRankEntryTierLabel(t, flexRankEntry)}
                </span>
                <span className={s.rankMeta}>
                  {formatMeta(flexRankEntry, winsShort, lpShort)}
                </span>
                {/* <span className={s.highestRank}>
                  <span className={s.highestRankLabel}>{highestLabel}</span>
                  <img
                    src={flexHighestIconUrl}
                    alt=""
                    className={s.highestRankIcon}
                  />
                  <span className={s.highestRankText}>
                    {formatRankEntryTierLabel(t, flexHighestRankEntry)}
                  </span>
                </span> */}
              </div>
              <div className={s.rankIconWrap}>
                {flexIconUrl ? (
                  <LazyImage
                    src={flexIconUrl}
                    alt={t("history.summary.flex", {
                      defaultValue: "Flex",
                    })}
                    className={s.rankIcon}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
