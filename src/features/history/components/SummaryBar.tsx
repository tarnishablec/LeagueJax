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
  _lossesShort: string,
  lpShort: string,
): string {
  if (!entry) {
    // return `-- ${winsShort} / -- ${_lossesShort} / -- ${lpShort}`;
    return `-- ${winsShort} / -- ${lpShort}`;
  }

  // return `${entry.wins}${winsShort} / ${entry.losses}${_lossesShort} / ${entry.leaguePoints} ${lpShort}`;
  return `${entry.wins}${winsShort} / ${entry.leaguePoints} ${lpShort}`;
}

export function SummaryBar({
  summoner,
  autoRefresh = true,
}: {
  summoner: SummonerInfo;
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
  const lossesShort = t("history.summary.lossesShort", { defaultValue: "L" });
  const lpShort = t("history.summary.lpShort", { defaultValue: "LP" });
  const soloIconUrl = useRankIcon(
    rankedSummary?.queueMap.RANKED_SOLO_5x5?.tier ?? "UNRANKED",
    false,
  );
  const flexIconUrl = useRankIcon(
    rankedSummary?.queueMap.RANKED_FLEX_SR?.tier ?? "UNRANKED",
    false,
  );

  return (
    <div className={s.bar}>
      <div className={s.avatarSlot}>
        <div className={s.iconFallback}>
          {avatarUrl ? (
            <LazyImage
              src={avatarUrl}
              alt="Profile icon"
              className={s.profileIcon}
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
            <span className={s.privacyBadge}>
              <Lock size={12} />
              {/*{t("history.summary.private", { defaultValue: "Private" })}*/}
            </span>
          )}
        </div>
        <div className={s.tag}>#{summoner.tagLine}</div>
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
                  {formatRankEntryTierLabel(
                    t,
                    rankedSummary?.queueMap.RANKED_SOLO_5x5 ?? null,
                  )}
                </span>
                <span className={s.rankMeta}>
                  {formatMeta(
                    rankedSummary?.queueMap.RANKED_SOLO_5x5 ?? null,
                    winsShort,
                    lossesShort,
                    lpShort,
                  )}
                </span>
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
                  {formatRankEntryTierLabel(
                    t,
                    rankedSummary?.queueMap.RANKED_FLEX_SR ?? null,
                  )}
                </span>
                <span className={s.rankMeta}>
                  {formatMeta(
                    rankedSummary?.queueMap.RANKED_FLEX_SR ?? null,
                    winsShort,
                    lossesShort,
                    lpShort,
                  )}
                </span>
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
