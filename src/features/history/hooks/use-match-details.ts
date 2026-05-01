import { invoke } from "@tauri-apps/api/core";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import type { RawMatchDetailsGame } from "@/bindings/matches.ts";

type MatchDetailsKey = readonly ["get_match_details", number, string | null];

const MAX_AUTO_MATCH_DETAILS_REQUESTS = 3;

type QueuedMatchDetailsRequest = {
  cacheKey: string;
  key: MatchDetailsKey;
  promise: Promise<RawMatchDetailsGame>;
  resolve: (value: RawMatchDetailsGame) => void;
  reject: (reason: unknown) => void;
};

let activeAutoRequestCount = 0;
const queuedAutoRequests: QueuedMatchDetailsRequest[] = [];
const queuedAutoRequestsByKey = new Map<string, QueuedMatchDetailsRequest>();
const inFlightRequests = new Map<string, Promise<RawMatchDetailsGame>>();

function matchDetailsCacheKey([
  command,
  gameId,
  sgpServerId,
]: MatchDetailsKey): string {
  return `${command}:${gameId}:${sgpServerId ?? ""}`;
}

function invokeMatchDetails([
  command,
  gameId,
  sgpServerId,
]: MatchDetailsKey): Promise<RawMatchDetailsGame> {
  return invoke<RawMatchDetailsGame>(command, {
    gameId,
    ...(sgpServerId ? { sgpServerId } : {}),
  });
}

function startMatchDetailsRequest(
  cacheKey: string,
  key: MatchDetailsKey,
): Promise<RawMatchDetailsGame> {
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request = invokeMatchDetails(key).finally(() => {
    inFlightRequests.delete(cacheKey);
  });
  inFlightRequests.set(cacheKey, request);
  return request;
}

function runQueuedAutoRequests(): void {
  while (
    activeAutoRequestCount < MAX_AUTO_MATCH_DETAILS_REQUESTS &&
    queuedAutoRequests.length > 0
  ) {
    const request = queuedAutoRequests.shift();
    if (!request) {
      return;
    }

    if (queuedAutoRequestsByKey.get(request.cacheKey) !== request) {
      continue;
    }

    queuedAutoRequestsByKey.delete(request.cacheKey);
    activeAutoRequestCount += 1;

    startMatchDetailsRequest(request.cacheKey, request.key)
      .then(request.resolve, request.reject)
      .finally(() => {
        activeAutoRequestCount -= 1;
        runQueuedAutoRequests();
      });
  }
}

function createQueuedAutoRequest(
  cacheKey: string,
  key: MatchDetailsKey,
): QueuedMatchDetailsRequest {
  let resolveRequest!: (value: RawMatchDetailsGame) => void;
  let rejectRequest!: (reason: unknown) => void;
  const promise = new Promise<RawMatchDetailsGame>((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });

  return {
    cacheKey,
    key,
    promise,
    resolve: resolveRequest,
    reject: rejectRequest,
  };
}

function fetchMatchDetailsQueued(
  key: MatchDetailsKey,
): Promise<RawMatchDetailsGame> {
  const cacheKey = matchDetailsCacheKey(key);
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const queued = queuedAutoRequestsByKey.get(cacheKey);
  if (queued) {
    return queued.promise;
  }

  const request = createQueuedAutoRequest(cacheKey, key);
  queuedAutoRequests.push(request);
  queuedAutoRequestsByKey.set(cacheKey, request);
  runQueuedAutoRequests();
  return request.promise;
}

function removeQueuedAutoRequest(request: QueuedMatchDetailsRequest): void {
  const index = queuedAutoRequests.indexOf(request);
  if (index >= 0) {
    queuedAutoRequests.splice(index, 1);
  }
  queuedAutoRequestsByKey.delete(request.cacheKey);
}

function fetchMatchDetailsImmediate(
  key: MatchDetailsKey,
): Promise<RawMatchDetailsGame> {
  const cacheKey = matchDetailsCacheKey(key);
  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const queued = queuedAutoRequestsByKey.get(cacheKey);
  if (queued) {
    removeQueuedAutoRequest(queued);
    const request = startMatchDetailsRequest(cacheKey, key);
    request.then(queued.resolve, queued.reject);
    return request;
  }

  return startMatchDetailsRequest(cacheKey, key);
}

export function useMatchDetails(
  gameId: number | null,
  sgpServerId: string | null,
  enabled: boolean,
) {
  const key = useMemo<MatchDetailsKey | null>(
    () => (gameId ? ["get_match_details", gameId, sgpServerId] : null),
    [gameId, sgpServerId],
  );

  const swr = useSWR(key, enabled ? fetchMatchDetailsQueued : null, {
    dedupingInterval: Number.POSITIVE_INFINITY,
    revalidateIfStale: enabled,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const load = useCallback(() => {
    if (!key) {
      return Promise.resolve(undefined);
    }
    if (swr.data) {
      return Promise.resolve(swr.data);
    }
    return swr.mutate(fetchMatchDetailsImmediate(key), {
      populateCache: true,
      revalidate: false,
    });
  }, [key, swr.data, swr.mutate]);

  return {
    ...swr,
    load,
  };
}
