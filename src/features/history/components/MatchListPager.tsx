import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as s from "./MatchList.css";

export function MatchListPager({
  page,
  canGoPrev,
  canGoNext,
  canRefresh,
  onPrev,
  onNext,
  onRefresh,
}: {
  page: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  canRefresh: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={s.pageControls}>
      <button
        type="button"
        className={s.pageButton}
        aria-label="Previous page"
        disabled={!canGoPrev}
        onClick={onPrev}
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
        onClick={onNext}
      >
        <ChevronRight size={14} />
      </button>
      <button
        type="button"
        className={s.refreshButton}
        aria-label={t("history.refreshAria", {
          defaultValue: "Refresh match history",
        })}
        disabled={!canRefresh}
        onClick={onRefresh}
      >
        <RotateCw size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
