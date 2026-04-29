import { useCallback, useEffect, useMemo, useState } from "react";
import type { MatchModeTag } from "./use-match-history";

type MatchListViewState = {
  modeTag: MatchModeTag;
  pageSize: number;
  page: number;
};

type PageUpdater = number | ((current: number) => number);

const DEFAULT_VIEW_STATE: MatchListViewState = {
  modeTag: "all",
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
    modeTag: state.modeTag,
    pageSize: normalizePageSize(state.pageSize),
    page: normalizePage(state.page),
  };
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

  useEffect(() => {
    setState(getCachedViewState(key));
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
    (modeTag: MatchModeTag) => {
      updateState((current) => ({
        ...current,
        modeTag,
        page: 1,
      }));
    },
    [updateState],
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
    modeTag: state.modeTag,
    pageSize: state.pageSize,
    page: state.page,
    setModeTag,
    setPageSize,
    setPage,
  };
}
