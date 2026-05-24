/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import { Loader } from "lucide-solid";
import type { JSX } from "solid-js";
import { createMemo, Show } from "solid-js";
import { Motion } from "solid-motionone";
import { ScrollArea } from "@/components/scroll-area/ScrollArea";
import { useSolidSettingValue } from "@/features/settings/use-setting-value";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useSolidTranslation } from "@/i18n/solid";
import {
  type EnrichedMatch,
  useSolidMatchHistory,
} from "../hooks/use-match-history";
import { useSolidMatchListViewState } from "../hooks/use-match-list-view-state";
import { HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING } from "../settings-ids";
import type { MatchModeTag } from "../types/match-mode";
import * as s from "./MatchList.css";
import { MatchListFilters } from "./MatchListFilters";
import { MatchListPager } from "./MatchListPager";
import { MatchCard } from "./match-card/index";
import { modeOptions, pageSizeOptions } from "./match-list-options";

interface MatchListBodyProps {
  isLoading: boolean;
  hasError: boolean;
  matchCount: number;
  modeTag: MatchModeTag;
  matches: EnrichedMatch[] | undefined;
  sgpServerId: string | null;
  listAnimationKey: string | null;
  reduceMotion: boolean;
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

function MatchListBody(props: MatchListBodyProps): JSX.Element {
  const matchCards = keyArray(
    () => props.matches ?? [],
    (match) =>
      `${match.json.platformId ?? props.sgpServerId ?? "focused"}:${match.json.gameId}`,
    (match) => (
      <MatchCard
        match={match()}
        me={match().me}
        sgpServerId={props.sgpServerId}
      />
    ),
  );

  return (
    <Show
      when={!props.isLoading}
      fallback={
        <div class={s.emptyState}>
          <Loader size={18} aria-hidden="true" class={s.loadingSpinner} />
        </div>
      }
    >
      <Show
        when={!props.hasError}
        fallback={<div class={s.emptyState}>{props.loadFailedLabel}</div>}
      >
        <Show
          when={props.matchCount > 0}
          fallback={
            <div class={s.emptyState}>
              {props.modeTag === "all"
                ? props.noMatchesLabel
                : props.noMatchesInFilterLabel}
            </div>
          }
        >
          <Show when={props.listAnimationKey} keyed>
            <Motion.div
              class={s.listMotionLayer}
              initial={props.reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.16, easing: "ease-out" }}
            >
              <ScrollArea
                className={s.listScroller}
                contentClassName={s.list}
                direction="vertical"
                mode="outset"
                outsetWidth="12px"
              >
                {matchCards()}
              </ScrollArea>
            </Motion.div>
          </Show>
        </Show>
      </Show>
    </Show>
  );
}

export function MatchList(props: {
  puuid: string;
  sgpServerId: string | null;
}): JSX.Element {
  const reduceMotion = usePrefersReducedMotion();
  const autoRefreshOnSwitch = useSolidSettingValue<boolean>(
    HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING,
    false,
  );
  const { t } = useSolidTranslation();
  const viewState = useSolidMatchListViewState(
    () => props.puuid,
    () => props.sgpServerId,
  );
  const history = useSolidMatchHistory({
    puuid: () => props.puuid,
    sgpServerId: () => props.sgpServerId,
    page: viewState.page,
    pageSize: viewState.pageSize,
    modeTag: viewState.modeTag,
    autoRefreshOnSwitch: () => autoRefreshOnSwitch() ?? false,
  });

  const matchCount = createMemo(() => history.matches()?.length ?? 0);
  const isMatchHistoryBusy = createMemo(
    () => history.isLoading() || history.isRefreshing(),
  );
  const canGoPrev = createMemo(
    () => viewState.page() > 1 && !isMatchHistoryBusy(),
  );
  const canGoNext = createMemo(
    () => history.hasNextPage() && !isMatchHistoryBusy(),
  );

  const modeSelectOptions = createMemo(() =>
    modeOptions.map((option) => ({
      value: option.value,
      label: t(option.labelKey),
    })),
  );
  const pageSizeSelectOptions = createMemo(() =>
    pageSizeOptions.map((option) => ({
      value: String(option),
      label: String(option),
    })),
  );
  const listAnimationKey = createMemo(() =>
    buildListAnimationKey({
      matches: history.matches(),
      modeTag: viewState.modeTag(),
      page: viewState.page(),
      pageSize: viewState.pageSize(),
      puuid: props.puuid,
      sgpServerId: props.sgpServerId,
    }),
  );

  return (
    <div class={s.panel}>
      <div class={s.toolbar}>
        <MatchListFilters
          modeTag={viewState.modeTag()}
          pageSize={viewState.pageSize()}
          disabled={isMatchHistoryBusy()}
          modeSelectOptions={modeSelectOptions()}
          pageSizeSelectOptions={pageSizeSelectOptions()}
          onModeChange={viewState.setModeTag}
          onPageSizeChange={(value) => viewState.setPageSize(Number(value))}
        />

        <MatchListPager
          page={viewState.page()}
          canGoPrev={canGoPrev()}
          canGoNext={canGoNext()}
          canRefresh={!isMatchHistoryBusy()}
          refreshing={isMatchHistoryBusy()}
          onPrev={() =>
            viewState.setPage((current) => Math.max(1, current - 1))
          }
          onNext={() => viewState.setPage((current) => current + 1)}
          onRefresh={() => {
            void history.refresh();
          }}
        />
      </div>

      <MatchListBody
        isLoading={history.isLoading()}
        hasError={Boolean(history.error())}
        matchCount={matchCount()}
        modeTag={viewState.modeTag()}
        matches={history.matches()}
        sgpServerId={props.sgpServerId}
        listAnimationKey={listAnimationKey()}
        reduceMotion={reduceMotion()}
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
