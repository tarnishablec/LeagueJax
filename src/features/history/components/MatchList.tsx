import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/scroll-area";
import { useSettings } from "@/features/settings/context";
import { useMatchHistory } from "../hooks/use-match-history";
import { useMatchListViewState } from "../hooks/use-match-list-view-state";
import { HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING } from "../manifest";
import * as s from "./MatchList.css";
import { MatchListFilters } from "./MatchListFilters";
import { MatchListPager } from "./MatchListPager";
import { MatchCard } from "./match-card";
import { modeOptions, pageSizeOptions } from "./match-list-options";

export function MatchList({
  puuid,
  sgpServerId,
}: {
  puuid: string;
  sgpServerId: string | null;
}) {
  const { t } = useTranslation();
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

      {isLoading ? (
        <div className={s.emptyState}>{t("common.loading")}</div>
      ) : error ? (
        <div className={s.emptyState}>
          {t("history.loadFailed", {
            defaultValue: "Failed to load match history",
          })}
        </div>
      ) : matchCount === 0 ? (
        <div className={s.emptyState}>
          {modeTag === "all"
            ? t("history.noMatches")
            : t("history.noMatchesInFilter", {
                defaultValue: "No matches found in this queue",
              })}
        </div>
      ) : (
        <ScrollArea
          className={s.listScroller}
          contentClassName={s.list}
          direction="vertical"
          mode="outset"
          outsetWidth="12px"
        >
          {matches?.map((match) => (
            <MatchCard
              key={match.json.gameId}
              match={match}
              me={match.me}
              sgpServerId={sgpServerId}
            />
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
