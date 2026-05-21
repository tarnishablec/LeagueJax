/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import { Lock } from "lucide-solid";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { RankEntry, RankStats } from "@/bindings/rank.ts";
import type { SummonerInfo } from "@/bindings/summoner.ts";
import { CopyButton } from "@/components/CopyButton";
import { LazyImage } from "@/components/LazyImage";
import { ProfileIcon } from "@/components/ProfileIcon";
import { useRankIcon as getRankIconUrl } from "@/hooks/use-rank-icon.ts";
import { useSolidTranslation } from "@/i18n/solid";
import { formatRankEntryTierLabel } from "@/utils/rank-display";
import { useSolidRankedSummary } from "../hooks/use-ranked-summary";
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

function RankCard(props: {
  label: string;
  entry: RankEntry | null;
  iconUrl: string | null;
  isLoading: boolean;
  winsShort: string;
  lpShort: string;
}): JSX.Element {
  const { t } = useSolidTranslation();

  return (
    <div class={s.rankCard}>
      <Show when={!props.isLoading}>
        <div class={s.rankCardInner}>
          <div class={s.rankContent}>
            <span class={s.rankQueue}>{props.label}</span>
            <span class={s.rankTier}>
              {formatRankEntryTierLabel(t, props.entry)}
            </span>
            <span class={s.rankMeta}>
              {formatMeta(props.entry, props.winsShort, props.lpShort)}
            </span>
          </div>
          <div class={s.rankIconWrap}>
            <Show when={props.iconUrl}>
              {(iconUrl) => (
                <LazyImage
                  src={iconUrl()}
                  alt={props.label}
                  className={s.rankIcon}
                />
              )}
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}

function RankCards(props: {
  rankedSummary: RankStats | undefined;
  rankedLoading: boolean;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const winsShort = () => t("history.summary.winsShort", { defaultValue: "W" });
  const lpShort = () => t("history.summary.lpShort", { defaultValue: "LP" });
  const soloLabel = () =>
    t("history.summary.solo", {
      defaultValue: "Solo/Duo",
    });
  const flexLabel = () =>
    t("history.summary.flex", {
      defaultValue: "Flex",
    });
  const soloRankEntry = () =>
    props.rankedSummary?.queueMap.RANKED_SOLO_5x5 ?? null;
  const flexRankEntry = () =>
    props.rankedSummary?.queueMap.RANKED_FLEX_SR ?? null;
  const soloIconUrl = () => getRankIconUrl(soloRankEntry()?.tier ?? "UNRANKED");
  const flexIconUrl = () => getRankIconUrl(flexRankEntry()?.tier ?? "UNRANKED");

  return (
    <>
      <RankCard
        label={soloLabel()}
        entry={soloRankEntry()}
        iconUrl={soloIconUrl()}
        isLoading={props.rankedLoading}
        winsShort={winsShort()}
        lpShort={lpShort()}
      />
      <RankCard
        label={flexLabel()}
        entry={flexRankEntry()}
        iconUrl={flexIconUrl()}
        isLoading={props.rankedLoading}
        winsShort={winsShort()}
        lpShort={lpShort()}
      />
    </>
  );
}

export function SummaryBar(props: {
  summoner: SummonerInfo;
  rankedPuuid?: string;
  rankUnavailable?: boolean;
  serverLabel?: string | null;
  autoRefresh?: boolean;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const rankedTargetPuuid = () =>
    props.rankUnavailable
      ? undefined
      : (props.rankedPuuid ?? props.summoner.puuid);
  const rankedQuery = useSolidRankedSummary(rankedTargetPuuid);
  const gameName = () =>
    props.summoner.gameName ||
    props.summoner.name ||
    props.summoner.puuid.slice(0, 8);
  const tagLine = () => props.summoner.tagLine.trim();
  const summonerId = () =>
    tagLine() ? `${gameName()}#${tagLine()}` : gameName();
  const showSummonerLevel = () => props.summoner.summonerLevel > 0;
  const hiddenHistoryText = () =>
    t("history.summary.hiddenHistory", {
      defaultValue: "Hidden match history",
    });
  const rankUnavailableText = () =>
    t("history.summary.crossRegionRankUnavailable", {
      defaultValue: "璺ㄥ尯鏃犳硶鏌ヨ娈典綅",
    });

  return (
    <div class={s.bar}>
      <div class={s.avatarSlot}>
        <div class={s.iconFallback}>
          <ProfileIcon
            profileIconId={props.summoner.profileIconId}
            alt="Profile icon"
            className={s.profileIcon}
            fallbackClassName={s.iconFallback}
            loadingClassName={s.iconFallback}
          />
        </div>
        <Show when={showSummonerLevel()}>
          <span class={s.levelBadge}>{props.summoner.summonerLevel}</span>
        </Show>
      </div>
      <div class={s.identity}>
        <div class={s.nameRow}>
          <span class={s.name}>{gameName()}</span>
          <CopyButton
            text={summonerId()}
            className={s.copyButton}
            aria-label={`Copy summoner id ${summonerId()}`}
          />
          <Show when={props.summoner.privacy === "PRIVATE"}>
            <Tooltip.Root openDelay={200} closeDelay={0}>
              <Tooltip.Trigger
                asChild={(getTriggerProps) => (
                  <button
                    {...getTriggerProps({
                      type: "button",
                      class: s.privacyBadge,
                      "aria-label": "Hidden match history",
                    })}
                  >
                    <Lock size={12} aria-hidden="true" />
                  </button>
                )}
              />
              <Portal>
                <Tooltip.Positioner class={s.tooltipPositioner}>
                  <Tooltip.Content class={s.tooltipContent}>
                    {hiddenHistoryText()}
                  </Tooltip.Content>
                </Tooltip.Positioner>
              </Portal>
            </Tooltip.Root>
          </Show>
        </div>
        <div class={s.tagRow}>
          <Show when={tagLine()}>
            {(tag) => <span class={s.tag}>#{tag()}</span>}
          </Show>
          <Show when={props.serverLabel}>
            {(serverLabel) => (
              <span class={s.serverBadge}>{serverLabel()}</span>
            )}
          </Show>
        </div>
      </div>
      <div class={s.ranks}>
        <Show
          when={props.rankUnavailable}
          fallback={
            <RankCards
              rankedSummary={rankedQuery.data()}
              rankedLoading={rankedQuery.isLoading()}
            />
          }
        >
          <div class={s.rankUnavailable}>{rankUnavailableText()}</div>
        </Show>
      </div>
    </div>
  );
}
