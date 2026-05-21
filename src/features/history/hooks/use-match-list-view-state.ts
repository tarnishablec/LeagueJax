import type { Accessor } from "solid-js";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { useSolidMatchListViewStore } from "../stores/match-list-view-store";
import { matchListViewStore } from "../stores/match-list-view-store-core";
import type { MatchModeTag } from "../types/match-mode";

type MatchListViewState = {
  pageSize: number;
  page: number;
};

type PageUpdater = number | ((current: number) => number);

const DEFAULT_VIEW_STATE: MatchListViewState = {
  pageSize: 20,
  page: 1,
};

const viewStateByListKey = new Map<string, MatchListViewState>();

function getListKey(puuid: string, sgpServerId: string | null): string {
  return `${sgpServerId ?? "local"}:${puuid}`;
}

function getCachedViewState(key: string): MatchListViewState {
  return viewStateByListKey.get(key) ?? DEFAULT_VIEW_STATE;
}

function normalizePage(page: number): number {
  if (!Number.isFinite(page)) {
    return DEFAULT_VIEW_STATE.page;
  }

  return Math.max(1, Math.floor(page));
}

function normalizePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize <= 0) {
    return DEFAULT_VIEW_STATE.pageSize;
  }

  return Math.floor(pageSize);
}

function normalizeViewState(state: MatchListViewState): MatchListViewState {
  return {
    pageSize: normalizePageSize(state.pageSize),
    page: normalizePage(state.page),
  };
}

function resetCachedPages(): void {
  for (const [key, state] of viewStateByListKey) {
    viewStateByListKey.set(key, {
      ...state,
      page: DEFAULT_VIEW_STATE.page,
    });
  }
}

export function useSolidMatchListViewState(
  puuid: Accessor<string>,
  sgpServerId: Accessor<string | null>,
) {
  const key = createMemo(() => getListKey(puuid(), sgpServerId()));
  const [state, setState] = createSignal(getCachedViewState(key()), {
    equals: false,
  });
  const modeTag = useSolidMatchListViewStore((store) => store.modeTag);
  const setSharedModeTag = useSolidMatchListViewStore(
    (store) => store.setModeTag,
  );
  let previousKey = key();

  const syncKey = () => {
    const nextKey = key();
    if (nextKey !== previousKey) {
      previousKey = nextKey;
      setState(getCachedViewState(nextKey));
    }
  };

  createEffect(syncKey);

  const unsubscribe = matchListViewStore.subscribe((nextState, previous) => {
    syncKey();
    if (nextState.modeTag !== previous.modeTag) {
      setState(getCachedViewState(key()));
    }
  });

  onCleanup(unsubscribe);

  const updateState = (
    resolve: (current: MatchListViewState) => MatchListViewState,
  ) => {
    setState((current) => {
      const next = normalizeViewState(resolve(current));
      viewStateByListKey.set(key(), next);
      return next;
    });
  };

  return {
    modeTag,
    pageSize: () => state().pageSize,
    page: () => state().page,
    setModeTag: (nextModeTag: MatchModeTag) => {
      resetCachedPages();
      updateState((current) => ({
        ...current,
        page: 1,
      }));
      setSharedModeTag(nextModeTag);
    },
    setPageSize: (pageSize: number) => {
      updateState((current) => ({
        ...current,
        pageSize,
        page: 1,
      }));
    },
    setPage: (page: PageUpdater) => {
      updateState((current) => ({
        ...current,
        page: typeof page === "function" ? page(current.page) : page,
      }));
    },
  };
}
