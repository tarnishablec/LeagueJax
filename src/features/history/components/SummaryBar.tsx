import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RankedQueueStats, SummonerInfo } from "@/bindings/summoner.ts";
import { useProfileIcon } from "@/hooks/use-profile-icon.ts";
import { useRankIcon } from "@/hooks/use-rank-icon.ts";
import { useRankedSummary } from "../hooks/use-ranked-summary";
import * as s from "./SummaryBar.css";

function formatTier(
  queue: RankedQueueStats | null,
  unrankedLabel: string,
): string {
  if (!queue) {
    return unrankedLabel;
  }

  const tier = queue.tier.trim();
  if (tier.length === 0 || tier.toUpperCase() === "UNRANKED") {
    return unrankedLabel;
  }

  const division = queue.division.trim();
  return division.length > 0 ? `${tier} ${division}` : tier;
}

function formatMeta(
  queue: RankedQueueStats | null,
  winsShort: string,
  lossesShort: string,
  lpShort: string,
): string {
  if (!queue) {
    return `-- ${winsShort} / -- ${lossesShort} / -- ${lpShort}`;
  }

  return `${queue.wins}${winsShort} / ${queue.losses}${lossesShort} / ${queue.leaguePoints} ${lpShort}`;
}

export function SummaryBar({ summoner }: { summoner: SummonerInfo }) {
  const { t } = useTranslation();
  const avatarUrl = useProfileIcon(summoner.profileIconId);
  const { data: rankedSummary } = useRankedSummary(summoner.puuid);
  const [copied, setCopied] = useState(false);
  const summonerId = `${summoner.gameName}#${summoner.tagLine}`;

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(summonerId);
      setCopied(true);
    } catch {
      // no-op: keep UI stable when clipboard API is unavailable
    }
  };

  const unrankedLabel = t("history.summary.unranked", {
    defaultValue: "Unranked",
  });
  const winsShort = t("history.summary.winsShort", { defaultValue: "W" });
  const lossesShort = t("history.summary.lossesShort", { defaultValue: "L" });
  const lpShort = t("history.summary.lpShort", { defaultValue: "LP" });
  const soloIconUrl = useRankIcon(
    rankedSummary?.solo?.tier ?? "UNRANKED",
    false,
  );
  const flexIconUrl = useRankIcon(
    rankedSummary?.flex?.tier ?? "UNRANKED",
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
        <span className={s.levelBadge}>{summoner.summonerLevel}</span>
      </div>
      <div className={s.identity}>
        <div className={s.nameRow}>
          <span className={s.name}>{summoner.gameName}</span>
          <button
            type="button"
            className={s.copyButton}
            aria-label={`Copy summoner id ${summonerId}`}
            onClick={() => {
              void copyId();
            }}
          >
            {copied ? (
              <Check size={12} aria-hidden="true" />
            ) : (
              <Copy size={12} aria-hidden="true" />
            )}
          </button>
        </div>
        <div className={s.tag}>#{summoner.tagLine}</div>
      </div>
      <div className={s.ranks}>
        <div className={s.rankCard}>
          <div className={s.rankContent}>
            <span className={s.rankQueue}>
              {t("history.summary.solo", { defaultValue: "Solo/Duo" })}
            </span>
            <span className={s.rankTier}>
              {formatTier(rankedSummary?.solo ?? null, unrankedLabel)}
            </span>
            <span className={s.rankMeta}>
              {formatMeta(
                rankedSummary?.solo ?? null,
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
                alt={t("history.summary.solo", { defaultValue: "Solo/Duo" })}
                className={s.rankIcon}
              />
            ) : null}
          </div>
        </div>
        <div className={s.rankCard}>
          <div className={s.rankContent}>
            <span className={s.rankQueue}>
              {t("history.summary.flex", { defaultValue: "Flex" })}
            </span>
            <span className={s.rankTier}>
              {formatTier(rankedSummary?.flex ?? null, unrankedLabel)}
            </span>
            <span className={s.rankMeta}>
              {formatMeta(
                rankedSummary?.flex ?? null,
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
      </div>
    </div>
  );
}
