import { invoke } from "@tauri-apps/api/core";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import type { RawMatchDetailsGame } from "@/bindings/matches.ts";

type MatchDetailsKey = readonly ["get_match_details", number, string | null];

function fetchMatchDetails([
  command,
  gameId,
  sgpServerId,
]: MatchDetailsKey): Promise<RawMatchDetailsGame> {
  return invoke<RawMatchDetailsGame>(command, {
    gameId,
    ...(sgpServerId ? { sgpServerId } : {}),
  });
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

  const swr = useSWR(key, enabled ? fetchMatchDetails : null, {
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
    return swr.mutate(fetchMatchDetails(key), {
      populateCache: true,
      revalidate: false,
    });
  }, [key, swr.data, swr.mutate]);

  return {
    ...swr,
    load,
  };
}
