import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/scroll-area";
import { useSettings } from "@/features/settings/context";
import {
  type EnrichedMatch,
  useMatchHistory,
} from "../hooks/use-match-history";
import { useMatchListViewState } from "../hooks/use-match-list-view-state";
import { HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING } from "../manifest";
import type { MatchModeTag } from "../types/match-mode";
import * as s from "./MatchList.css";
import { MatchListFilters } from "./MatchListFilters";
import { MatchListPager } from "./MatchListPager";
import { MatchCard } from "./match-card";
import { modeOptions, pageSizeOptions } from "./match-list-options";

interface MatchListBodyProps {
  isLoading: boolean;
  hasError: boolean;
  matchCount: number;
  modeTag: MatchModeTag;
  matches: EnrichedMatch[] | undefined;
  sgpServerId: string | null;
  listAnimationKey: string | null;
  reduceMotion: boolean | null;
  loadingLabel: string;
  loadFailedLabel: string;
  noMatchesLabel: string;
  noMatchesInFilterLabel: string;
}

function buildListAnimationKey({
  matches,
  modeTag,
  page,
  pageSize,
  puuid,
  sgpServerId,
}: {
  matches: EnrichedMatch[] | undefined;
  modeTag: MatchModeTag;
  page: number;
  pageSize: number;
  puuid: string;
  sgpServerId: string | null;
}) {
  if (!matches) {
    return null;
  }

  return [
    puuid,
    sgpServerId ?? "focused",
    page,
    pageSize,
    modeTag,
    matches.map((match) => match.json.gameId).join(","),
  ].join(":");
}

function MatchListBody({
  isLoading,
  hasError,
  matchCount,
  modeTag,
  matches,
  sgpServerId,
  listAnimationKey,
  reduceMotion,
  loadingLabel,
  loadFailedLabel,
  noMatchesLabel,
  noMatchesInFilterLabel,
}: MatchListBodyProps) {
  if (isLoading) {
    return <div className={s.emptyState}>{loadingLabel}</div>;
  }

  if (hasError) {
    return <div className={s.emptyState}>{loadFailedLabel}</div>;
  }

  if (matchCount === 0) {
    return (
      <div className={s.emptyState}>
        {modeTag === "all" ? noMatchesLabel : noMatchesInFilterLabel}
      </div>
    );
  }

  return (
    <motion.div
      key={listAnimationKey}
      className={s.listMotionLayer}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <ScrollArea
        className={s.listScroller}
        contentClassName={s.list}
        direction="vertical"
        mode="outset"
        outsetWidth="12px"
      >
        {(matches ?? []).map((match) => (
          <MatchCard
            key={match.json.gameId}
            match={match}
            me={match.me}
            sgpServerId={sgpServerId}
          />
        ))}
      </ScrollArea>
    </motion.div>
  );
}

export function MatchList({
  puuid,
  sgpServerId,
}: {
  puuid: string;
  sgpServerId: string | null;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const settings = useSettings();
  const autoRefreshOnSwitch = useSyncExternalStore(
    (cb) => settings.subscribe(HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING, cb),
    () =>
      settings.get<boolean>(HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING) ??
      false,
  );
  const { modeTag, pageSize, page, setModeTag, setPageSize, setPage } =
    useMatchListViewState(puuid, sgpServerId);
  const { matches, error, isLoading, isRefreshing, hasNextPage, refresh } =
    useMatchHistory(
      puuid,
      sgpServerId,
      page,
      pageSize,
      modeTag,
      autoRefreshOnSwitch,
    );

  const matchCount = matches?.length ?? 0;
  const isMatchHistoryBusy = isLoading || isRefreshing;
  const canGoPrev = page > 1 && !isMatchHistoryBusy;
  const canGoNext = hasNextPage && !isMatchHistoryBusy;

  const modeSelectOptions = modeOptions.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));
  const pageSizeSelectOptions = pageSizeOptions.map((option) => ({
    value: String(option),
    label: String(option),
  }));

  const canRefresh = !isMatchHistoryBusy;
  const listAnimationKey = buildListAnimationKey({
    matches,
    modeTag,
    page,
    pageSize,
    puuid,
    sgpServerId,
  });

  return (
    <div className={s.panel}>
      <div className={s.toolbar}>
        <MatchListFilters
          modeTag={modeTag}
          pageSize={pageSize}
          disabled={isMatchHistoryBusy}
          modeSelectOptions={modeSelectOptions}
          pageSizeSelectOptions={pageSizeSelectOptions}
          onModeChange={(value) => {
            setModeTag(value);
          }}
          onPageSizeChange={(value) => {
            setPageSize(Number(value));
          }}
        />

        <MatchListPager
          page={page}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          canRefresh={canRefresh}
          refreshing={isMatchHistoryBusy}
          onPrev={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => current + 1)}
          onRefresh={() => {
            void refresh();
          }}
        />
      </div>

      <MatchListBody
        isLoading={isLoading}
        hasError={Boolean(error)}
        matchCount={matchCount}
        modeTag={modeTag}
        matches={matches}
        sgpServerId={sgpServerId}
        listAnimationKey={listAnimationKey}
        reduceMotion={reduceMotion}
        loadingLabel={t("common.loading")}
        loadFailedLabel={t("history.loadFailed", {
          defaultValue: "Failed to load match history",
        })}
        noMatchesLabel={t("history.noMatches")}
        noMatchesInFilterLabel={t("history.noMatchesInFilter", {
          defaultValue: "No matches found in this queue",
        })}
      />
    </div>
  );
}
