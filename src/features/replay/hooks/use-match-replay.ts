import { invoke } from "@tauri-apps/api/core";
import type { Accessor } from "solid-js";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { RawMatchSummaryGame } from "@/bindings/matches";
import type {
  LcuReplayDownloadState,
  ReplayMatchContext,
  ReplayMatchState,
} from "@/bindings/replay";

const POLL_INTERVAL_MS = 500;

function isPollingState(state: LcuReplayDownloadState): boolean {
  return state === "downloading";
}

function normalizeProgress(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  if (value <= 1) {
    return Math.round(value * 100);
  }

  if (value <= 100) {
    return Math.round(value);
  }

  return null;
}

export function replayMatchContextFromSummary(
  summary: RawMatchSummaryGame,
  sgpServerId: string | null,
): ReplayMatchContext {
  const gameEnd =
    summary.json.gameEndTimestamp > 0
      ? summary.json.gameEndTimestamp
      : summary.json.gameCreation + summary.json.gameDuration * 1000;

  return {
    gameId: summary.json.gameId,
    gameVersion: summary.json.gameVersion || null,
    gameType: summary.json.gameType || null,
    queueId: summary.json.queueId,
    gameEnd,
    platformId: summary.json.platformId || null,
    sgpServerId,
  };
}

export function useSolidMatchReplay(context: Accessor<ReplayMatchContext>) {
  const [state, setState] = createSignal<ReplayMatchState | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isActing, setIsActing] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const gameId = createMemo(() => context().gameId);
  const downloadState = createMemo(() => state()?.metadata.state ?? null);
  const progress = createMemo(() => {
    const current = state();
    return current
      ? normalizeProgress(current.metadata.downloadProgress)
      : null;
  });

  const refresh = async () => {
    if (!gameId()) {
      return null;
    }

    const next = await invoke<ReplayMatchState>("replay_get_match_metadata", {
      gameId: gameId(),
    });
    setState(next);
    return next;
  };

  createEffect(() => {
    const currentContext = context();
    const currentGameId = currentContext.gameId;
    let cancelled = false;

    async function prepare() {
      if (!currentGameId) {
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const next = await invoke<ReplayMatchState>("replay_prepare_match", {
          context: currentContext,
        });
        if (!cancelled) {
          setState(next);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(String(caught));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void prepare();

    onCleanup(() => {
      cancelled = true;
    });
  });

  createEffect(() => {
    const currentState = downloadState();
    if (!currentState || !isPollingState(currentState)) {
      return;
    }

    const timer = window.setInterval(() => {
      void refresh().catch((caught) => {
        setError(String(caught));
      });
    }, POLL_INTERVAL_MS);

    onCleanup(() => {
      window.clearInterval(timer);
    });
  });

  const download = async () => {
    if (!gameId()) {
      return;
    }

    setIsActing(true);
    setError(null);
    try {
      const next = await invoke<ReplayMatchState>("replay_download_match", {
        gameId: gameId(),
      });
      setState(next);
    } catch (caught) {
      setError(String(caught));
    } finally {
      setIsActing(false);
    }
  };

  const watch = async () => {
    if (!gameId()) {
      return;
    }

    setIsActing(true);
    setError(null);
    try {
      await invoke("replay_watch_match", { gameId: gameId() });
    } catch (caught) {
      setError(String(caught));
    } finally {
      setIsActing(false);
    }
  };

  return {
    state,
    downloadState,
    progress,
    isLoading,
    isActing,
    error,
    download,
    watch,
    refresh,
  };
}
