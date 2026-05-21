/** @jsxImportSource solid-js */
import { ChevronLeft, ChevronRight } from "lucide-solid";
import type { JSX } from "solid-js";
import { RefreshButton } from "@/components/RefreshButton";
import { useSolidTranslation } from "@/i18n/solid";
import * as s from "./MatchList.css";

export function MatchListPager(props: {
  page: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  canRefresh: boolean;
  refreshing: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRefresh: () => void;
}): JSX.Element {
  const { t } = useSolidTranslation();

  return (
    <div class={s.pageControls}>
      <button
        type="button"
        class={s.pageButton}
        aria-label="Previous page"
        disabled={!props.canGoPrev}
        onClick={props.onPrev}
      >
        <ChevronLeft size={14} />
      </button>
      <div class={s.pageIndicator}>
        {t("history.pageNumber", {
          page: props.page,
        })}
      </div>
      <button
        type="button"
        class={s.pageButton}
        aria-label="Next page"
        disabled={!props.canGoNext}
        onClick={props.onNext}
      >
        <ChevronRight size={14} />
      </button>
      <RefreshButton
        loading={props.refreshing}
        disabled={!props.canRefresh}
        onClick={props.onRefresh}
        ariaLabel={t("history.refreshAria", {
          defaultValue: "Refresh match history",
        })}
      />
    </div>
  );
}
