import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsSelect } from "@/components/settings-ui";
import { type MatchModeTag, useMatchHistory } from "../hooks/use-match-history";
import { MatchCard } from "./MatchCard";
import * as s from "./MatchList.css";

const modeOptions: Array<{
  value: MatchModeTag;
  labelKey: string;
}> = [
  { value: "all", labelKey: "history.mode.all" },
  { value: "q_420", labelKey: "history.mode.q420" },
  { value: "q_430", labelKey: "history.mode.q430" },
  { value: "q_440", labelKey: "history.mode.q440" },
  { value: "q_450", labelKey: "history.mode.q450" },
  { value: "q_480", labelKey: "history.mode.q480" },
  { value: "q_1700", labelKey: "history.mode.q1700" },
  { value: "q_490", labelKey: "history.mode.q490" },
  { value: "q_1900", labelKey: "history.mode.q1900" },
  { value: "q_900", labelKey: "history.mode.q900" },
  { value: "q_2300", labelKey: "history.mode.q2300" },
];

const pageSizeOptions = [20, 50, 100] as const;

const placeholderFilterOptions = [
  { value: "all", labelKey: "history.filter.all" },
  { value: "preset_a", labelKey: "history.filter.presetA" },
  { value: "preset_b", labelKey: "history.filter.presetB" },
] as const;

export function MatchList({ puuid }: { puuid: string }) {
  const { t } = useTranslation();
  const [modeTag, setModeTag] = useState<MatchModeTag>("all");
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const [placeholderFilter, setPlaceholderFilter] = useState<string>("all");
  const previousPuuidRef = useRef<string | null>(null);
  const { matches, error, isLoading, isRefreshing, hasNextPage } =
    useMatchHistory(puuid, page, pageSize, modeTag);

  const hasMatch = matches.length > 0;
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
  const filterSelectOptions = placeholderFilterOptions.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  return (
    <div className={s.panel}>
      <div className={s.toolbar}>
        {/*<span className={s.selectLabel}>{t("history.modeLabel")}</span>*/}
        <SettingsSelect
          ariaLabel="History mode"
          value={modeTag}
          options={modeSelectOptions}
          onValueChange={(value) => {
            setModeTag(value as MatchModeTag);
            setPage(1);
          }}
        />

        {/*<span className={s.selectLabel}>{t("history.pageSizeLabel")}</span>*/}
        <SettingsSelect
          ariaLabel="History page size"
          value={String(pageSize)}
          options={pageSizeSelectOptions}
          onValueChange={(value) => {
            setPageSize(Number(value));
            setPage(1);
          }}
        />

        {/*<span className={s.selectLabel}>{t("history.filterLabel")}</span>*/}
        <SettingsSelect
          ariaLabel="History filter placeholder"
          value={placeholderFilter}
          options={filterSelectOptions}
          onValueChange={(value) => setPlaceholderFilter(value)}
        />

        <button
          type="button"
          className={s.pageButton}
          aria-label="Previous page"
          disabled={!canGoPrev}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          <ChevronLeft size={14} />
        </button>
        <div className={s.pageIndicator}>
          {t("history.pageNumber", {
            page,
          })}
        </div>
        <button
          type="button"
          className={s.pageButton}
          aria-label="Next page"
          disabled={!canGoNext}
          onClick={() => setPage((current) => current + 1)}
        >
          <ChevronRight size={14} />
        </button>
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
          {matches.map((match) => (
            <MatchCard key={match.gameId} match={match} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
