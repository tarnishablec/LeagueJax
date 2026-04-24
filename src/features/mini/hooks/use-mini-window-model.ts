import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo } from "react";
import type { MatchmakingSearchData } from "@/bindings/lcu_events";
import type { OngoingGameUpdated } from "@/bindings/ongoing_game";
import type { LcuQueue } from "@/bindings/queues";
import { useOngoingGameStore } from "@/features/ongoing-game/store";
import { useLcuMaps } from "@/hooks/use-lcu-maps";
import { useLcuQueues } from "@/hooks/use-lcu-queues";

export type MiniWindowModel = {
  phase: OngoingGameUpdated["phase"];
  queueName: string | null;
  mapIconSrc: string | null;
  readyCheck: OngoingGameUpdated["ready_check"];
};

const MAP_ASSET_KEYS = [
  "game-select-icon-active",
  "game-select-icon-hover",
  "game-select-icon-disabled",
  "icon-v2",
  "icon",
];

function preferredMapAsset(
  map: { assets: Record<string, unknown> } | null | undefined,
): string | null {
  if (!map) {
    return null;
  }

  for (const key of MAP_ASSET_KEYS) {
    const asset = map.assets[key];
    if (typeof asset === "string" && asset.length > 0) {
      return asset;
    }
  }

  return (
    Object.values(map.assets).find(
      (asset): asset is string => typeof asset === "string" && asset.length > 0,
    ) ?? null
  );
}

function queueNameForId(
  queues: LcuQueue[] | undefined,
  queueId: number | null,
): string | null {
  if (queueId == null) {
    return null;
  }

  const queue = queues?.find((entry) => entry.id === queueId);
  return queue?.shortName ?? queue?.name ?? `Queue ${queueId}`;
}

function queueIdFromState(
  effectiveQueueId: number | null,
  matchmakingSearch: MatchmakingSearchData | null,
  gameflowSession: OngoingGameUpdated["gameflow_session"],
): number | null {
  return (
    effectiveQueueId ??
    matchmakingSearch?.queueId ??
    gameflowSession?.gameData.queue.id ??
    null
  );
}

export function useMiniWindowModel(): MiniWindowModel {
  const { data: queues } = useLcuQueues();
  const { data: maps } = useLcuMaps();

  const phase = useOngoingGameStore((state) => state.phase);
  const effectiveQueueId = useOngoingGameStore(
    (state) => state.effectiveQueueId,
  );
  const gameflowSession = useOngoingGameStore((state) => state.gameflowSession);
  const matchmakingSearch = useOngoingGameStore(
    (state) => state.matchmakingSearch,
  );
  const readyCheck = useOngoingGameStore((state) => state.readyCheck);

  useEffect(() => {
    void invoke<OngoingGameUpdated>("ongoing_game_get_snapshot")
      .then((snapshot) => {
        useOngoingGameStore.getState().applyUpdated(snapshot);
      })
      .catch(() => {});
  }, []);

  return useMemo(() => {
    const queueId = queueIdFromState(
      effectiveQueueId,
      matchmakingSearch,
      gameflowSession,
    );
    const sessionMap = gameflowSession?.map ?? null;
    const knownMap = sessionMap
      ? (maps?.find((map) => map.id === sessionMap.id) ?? sessionMap)
      : null;

    return {
      phase,
      queueName: queueNameForId(queues, queueId),
      mapIconSrc: preferredMapAsset(knownMap),
      readyCheck,
    };
  }, [
    effectiveQueueId,
    gameflowSession,
    maps,
    matchmakingSearch,
    phase,
    queues,
    readyCheck,
  ]);
}
