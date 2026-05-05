import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export function useMatchReplay(context: ReplayMatchContext) {
  const [state, setState] = useState<ReplayMatchState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameId = context.gameId;
  const downloadState = state?.metadata.state ?? null;
  const progress = useMemo(
    () => (state ? normalizeProgress(state.metadata.downloadProgress) : null),
    [state],
  );

  const refresh = useCallback(async () => {
    if (!gameId) {
      return null;
    }

    const next = await invoke<ReplayMatchState>("replay_get_match_metadata", {
      gameId,
    });
    setState(next);
    return next;
  }, [gameId]);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (!gameId) {
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const next = await invoke<ReplayMatchState>("replay_prepare_match", {
          context,
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

    return () => {
      cancelled = true;
    };
  }, [context, gameId]);

  useEffect(() => {
    if (!downloadState || !isPollingState(downloadState)) {
      return;
    }

    const timer = window.setInterval(() => {
      void refresh().catch((caught) => {
        setError(String(caught));
      });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [downloadState, refresh]);

  const download = useCallback(async () => {
    if (!gameId) {
      return;
    }

    setIsActing(true);
    setError(null);
    try {
      const next = await invoke<ReplayMatchState>("replay_download_match", {
        gameId,
      });
      setState(next);
    } catch (caught) {
      setError(String(caught));
    } finally {
      setIsActing(false);
    }
  }, [gameId]);

  const watch = useCallback(async () => {
    if (!gameId) {
      return;
    }

    setIsActing(true);
    setError(null);
    try {
      await invoke("replay_watch_match", { gameId });
    } catch (caught) {
      setError(String(caught));
    } finally {
      setIsActing(false);
    }
  }, [gameId]);

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
