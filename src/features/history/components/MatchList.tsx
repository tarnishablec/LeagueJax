import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistoryRefresh } from "../hooks/use-history-refresh";
import { type MatchModeTag, useMatchHistory } from "../hooks/use-match-history";
import { MatchCard } from "./MatchCard";
import * as s from "./MatchList.css";
import { MatchListFilters } from "./MatchListFilters";
import { MatchListPager } from "./MatchListPager";
import { modeOptions, pageSizeOptions } from "./match-list-options";

export function MatchList({
  puuid,
  sgpServerId,
}: {
  puuid: string;
  sgpServerId: string | null;
}) {
  const { t } = useTranslation();
  const [modeTag, setModeTag] = useState<MatchModeTag>("all");
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const { refreshing, refresh } = useHistoryRefresh();
  const previousPuuidRef = useRef<string | null>(null);
  const { matches, error, isLoading, isRefreshing, hasNextPage } =
    useMatchHistory(puuid, sgpServerId, page, pageSize, modeTag);

  const hasMatch = matches?.length ?? 0;
  const canGoPrev = page > 1 && !isLoading && !isRefreshing;
  const canGoNext = hasNextPage && !isLoading && !isRefreshing;

  useEffect(() => {
    if (previousPuuidRef.current !== puuid) {
      previousPuuidRef.current = puuid ?? null;
      setPage(1);
    }
  }, [puuid]);

  const modeSelectOptions = modeOptions.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));
  const pageSizeSelectOptions = pageSizeOptions.map((option) => ({
    value: String(option),
    label: String(option),
  }));

  const canRefresh = !isLoading && !isRefreshing && !refreshing;

  return (
    <div className={s.panel}>
      <div className={s.toolbar}>
        <MatchListFilters
          modeTag={modeTag}
          pageSize={pageSize}
          modeSelectOptions={modeSelectOptions}
          pageSizeSelectOptions={pageSizeSelectOptions}
          onModeChange={(value) => {
            setModeTag(value);
            setPage(1);
          }}
          onPageSizeChange={(value) => {
            setPageSize(Number(value));
            setPage(1);
          }}
        />

        <MatchListPager
          page={page}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          canRefresh={canRefresh}
          onPrev={() => setPage((current) => Math.max(1, current - 1))}
          onNext={() => setPage((current) => current + 1)}
          onRefresh={() => {
            void refresh();
          }}
        />
      </div>

      {isLoading ? (
        <div className={s.emptyState}>{t("common.loading")}</div>
      ) : null}

      {error ? (
        <div className={s.emptyState}>
          {t("history.loadFailed", {
            defaultValue: "Failed to load match history",
          })}
        </div>
      ) : null}

      {!isLoading && !error && !hasMatch ? (
        <div className={s.emptyState}>
          {modeTag === "all"
            ? t("history.noMatches")
            : t("history.noMatchesInFilter", {
                defaultValue: "No matches found in this queue",
              })}
        </div>
      ) : null}

      {!isLoading && !error && hasMatch ? (
        <div className={s.list}>
          {matches?.map((match) => (
            <MatchCard
              key={match.json.gameId}
              match={match}
              me={match.me}
              sgpServerId={sgpServerId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
