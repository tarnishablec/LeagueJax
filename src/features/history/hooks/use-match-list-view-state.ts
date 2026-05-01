import { useCallback, useEffect, useMemo, useState } from "react";
import { useMatchListViewStore } from "../stores/match-list-view-store";
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

export function useMatchListViewState(
  puuid: string,
  sgpServerId: string | null,
) {
  const key = useMemo(
    () => getListKey(puuid, sgpServerId),
    [puuid, sgpServerId],
  );
  const [state, setState] = useState(() => getCachedViewState(key));
  const modeTag = useMatchListViewStore((store) => store.modeTag);
  const setSharedModeTag = useMatchListViewStore((store) => store.setModeTag);

  useEffect(() => {
    setState(getCachedViewState(key));
  }, [key]);

  useEffect(() => {
    return useMatchListViewStore.subscribe((state, previousState) => {
      if (state.modeTag !== previousState.modeTag) {
        setState(getCachedViewState(key));
      }
    });
  }, [key]);

  const updateState = useCallback(
    (resolve: (current: MatchListViewState) => MatchListViewState) => {
      setState((current) => {
        const next = normalizeViewState(resolve(current));
        viewStateByListKey.set(key, next);
        return next;
      });
    },
    [key],
  );

  const setModeTag = useCallback(
    (nextModeTag: MatchModeTag) => {
      resetCachedPages();
      updateState((current) => ({
        ...current,
        page: 1,
      }));
      setSharedModeTag(nextModeTag);
    },
    [setSharedModeTag, updateState],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      updateState((current) => ({
        ...current,
        pageSize,
        page: 1,
      }));
    },
    [updateState],
  );

  const setPage = useCallback(
    (page: PageUpdater) => {
      updateState((current) => ({
        ...current,
        page: typeof page === "function" ? page(current.page) : page,
      }));
    },
    [updateState],
  );

  return {
    modeTag,
    pageSize: state.pageSize,
    page: state.page,
    setModeTag,
    setPageSize,
    setPage,
  };
}
