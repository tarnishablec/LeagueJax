import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RankEntry, RankStats } from "@/bindings/rank.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { CopyButton } from "@/components/CopyButton";
import { LazyImage } from "@/components/LazyImage.tsx";
import { ProfileIcon } from "@/components/ProfileIcon";
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

function RankCard({
  label,
  entry,
  iconUrl,
  isLoading,
  winsShort,
  lpShort,
}: {
  label: string;
  entry: RankEntry | null;
  iconUrl: string | null;
  isLoading: boolean;
  winsShort: string;
  lpShort: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={s.rankCard}>
      {!isLoading && (
        <div className={s.rankCardInner}>
          <div className={s.rankContent}>
            <span className={s.rankQueue}>{label}</span>
            <span className={s.rankTier}>
              {formatRankEntryTierLabel(t, entry)}
            </span>
            <span className={s.rankMeta}>
              {formatMeta(entry, winsShort, lpShort)}
            </span>
          </div>
          <div className={s.rankIconWrap}>
            {iconUrl ? (
              <LazyImage src={iconUrl} alt={label} className={s.rankIcon} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function RankCards({
  rankedSummary,
  rankedLoading,
}: {
  rankedSummary: RankStats | undefined;
  rankedLoading: boolean;
}) {
  const { t } = useTranslation();
  const winsShort = t("history.summary.winsShort", { defaultValue: "W" });
  const lpShort = t("history.summary.lpShort", { defaultValue: "LP" });
  const soloLabel = t("history.summary.solo", {
    defaultValue: "Solo/Duo",
  });
  const flexLabel = t("history.summary.flex", {
    defaultValue: "Flex",
  });
  const soloRankEntry = rankedSummary?.queueMap.RANKED_SOLO_5x5 ?? null;
  const flexRankEntry = rankedSummary?.queueMap.RANKED_FLEX_SR ?? null;
  const soloIconUrl = useRankIcon(soloRankEntry?.tier ?? "UNRANKED", false);
  const flexIconUrl = useRankIcon(flexRankEntry?.tier ?? "UNRANKED", false);

  return (
    <>
      <RankCard
        label={soloLabel}
        entry={soloRankEntry}
        iconUrl={soloIconUrl}
        isLoading={rankedLoading}
        winsShort={winsShort}
        lpShort={lpShort}
      />
      <RankCard
        label={flexLabel}
        entry={flexRankEntry}
        iconUrl={flexIconUrl}
        isLoading={rankedLoading}
        winsShort={winsShort}
        lpShort={lpShort}
      />
    </>
  );
}

export function SummaryBar({
  summoner,
  rankedPuuid,
  rankUnavailable = false,
  serverLabel,
  autoRefresh = true,
}: {
  summoner: SummonerInfo;
  rankedPuuid?: string;
  rankUnavailable?: boolean;
  serverLabel?: string | null;
  autoRefresh?: boolean;
}) {
  const { t } = useTranslation();
  const rankedTargetPuuid = rankUnavailable
    ? undefined
    : (rankedPuuid ?? summoner.puuid);
  const { data: rankedSummary, isLoading: rankedLoading } = useRankedSummary(
    rankedTargetPuuid,
    autoRefresh,
  );
  const gameName =
    summoner.gameName || summoner.name || summoner.puuid.slice(0, 8);
  const tagLine = summoner.tagLine.trim();
  const summonerId = tagLine ? `${gameName}#${tagLine}` : gameName;

  const hiddenHistoryText = t("history.summary.hiddenHistory", {
    defaultValue: "Hidden match history",
  });
  const rankUnavailableText = t("history.summary.crossRegionRankUnavailable", {
    defaultValue: "跨区无法查询段位",
  });

  return (
    <div className={s.bar}>
      <div className={s.avatarSlot}>
        <div className={s.iconFallback}>
          <ProfileIcon
            profileIconId={summoner.profileIconId}
            alt="Profile icon"
            className={s.profileIcon}
            fallbackClassName={s.iconFallback}
            loadingClassName={s.iconFallback}
          />
        </div>
      </div>
      <div className={s.identity}>
        <div className={s.nameRow}>
          <span className={s.name}>{gameName}</span>
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
          {tagLine ? <span className={s.tag}>#{tagLine}</span> : null}
          {serverLabel ? (
            <span className={s.serverBadge}>{serverLabel}</span>
          ) : null}
        </div>
      </div>
      <div className={s.ranks}>
        {rankUnavailable ? (
          <div className={s.rankUnavailable}>{rankUnavailableText}</div>
        ) : (
          <RankCards
            rankedSummary={rankedSummary}
            rankedLoading={rankedLoading}
          />
        )}
      </div>
    </div>
  );
}
