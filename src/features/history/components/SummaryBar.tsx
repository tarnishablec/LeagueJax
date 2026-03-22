import { useTranslation } from "react-i18next";
import type { RankEntry } from "@/bindings/rank.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { CopyButton } from "@/components/CopyButton";
import { useDragonStaticData } from "@/hooks/use-dragon-static-data";
import { useRankIcon } from "@/hooks/use-rank-icon.ts";
import { useRankedSummary } from "../hooks/use-ranked-summary";
import * as s from "./SummaryBar.css";

function formatTier(entry: RankEntry | null, unrankedLabel: string): string {
  if (!entry) {
    return unrankedLabel;
  }

  const tier = entry.tier.trim();
  if (tier.length === 0 || tier.toUpperCase() === "UNRANKED") {
    return unrankedLabel;
  }

  const division = entry.division.trim();
  return division.length > 0 ? `${tier} ${division}` : tier;
}

function formatMeta(
  entry: RankEntry | null,
  winsShort: string,
  lossesShort: string,
  lpShort: string,
): string {
  if (!entry) {
    return `-- ${winsShort} / -- ${lossesShort} / -- ${lpShort}`;
  }

  return `${entry.wins}${winsShort} / ${entry.losses}${lossesShort} / ${entry.leaguePoints} ${lpShort}`;
}

export function SummaryBar({ summoner }: { summoner: SummonerInfo }) {
  const { t } = useTranslation();
  const { src: avatarUrl } = useDragonStaticData({
    type: "profile-icon",
    profileIconId: summoner.profileIconId,
  });
  const { data: rankedSummary, isLoading: rankedLoading } = useRankedSummary(
    summoner.puuid,
  );
  const summonerId = `${summoner.gameName}#${summoner.tagLine}`;

  const unrankedLabel = t("history.summary.unranked", {
    defaultValue: "Unranked",
  });
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
            <img src={avatarUrl} alt="Profile icon" className={s.profileIcon} />
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
        </div>
        <div className={s.tag}>#{summoner.tagLine}</div>
      </div>
      <div className={s.ranks}>
        <div className={s.rankCard}>
          {!rankedLoading && (
            <div className={s.rankCardInner}>
              <div className={s.rankContent}>
                <span className={s.rankQueue}>
                  {t("history.summary.solo", { defaultValue: "Solo/Duo" })}
                </span>
                <span className={s.rankTier}>
                  {formatTier(
                    rankedSummary?.queueMap.RANKED_SOLO_5x5 ?? null,
                    unrankedLabel,
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
                  <img
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
                  {t("history.summary.flex", { defaultValue: "Flex" })}
                </span>
                <span className={s.rankTier}>
                  {formatTier(
                    rankedSummary?.queueMap.RANKED_FLEX_SR ?? null,
                    unrankedLabel,
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
                  <img
                    src={flexIconUrl}
                    alt={t("history.summary.flex", { defaultValue: "Flex" })}
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
