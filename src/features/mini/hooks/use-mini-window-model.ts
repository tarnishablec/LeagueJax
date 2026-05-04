import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo } from "react";
import type {
  BenchChampion,
  ChampSelectSessionData,
  MatchmakingSearchData,
  TeamMember,
} from "@/bindings/lcu_events";
import type { OngoingGameUpdated } from "@/bindings/ongoing_game";
import type { LcuQueue } from "@/bindings/queues";
import { useOngoingGameStore } from "@/features/ongoing-game/store";
import { useLcuMaps } from "@/hooks/use-lcu-maps";
import { useLcuQueues } from "@/hooks/use-lcu-queues";
import { preferredLcuMapAsset } from "@/utils/lcu-map-assets";

export type MiniChampSelectMode = "bench" | "default";

export type MiniChampSelectModel = {
  session: ChampSelectSessionData;
  mode: MiniChampSelectMode;
  queueId: number | null;
  localPlayer: TeamMember | null;
  selectedChampionId: number | null;
  benchChampions: BenchChampion[];
};

export type MiniWindowModel = {
  phase: OngoingGameUpdated["phase"];
  queueName: string | null;
  mapIconSrc: string | null;
  isSpectating: boolean;
  readyCheck: OngoingGameUpdated["ready_check"];
  champSelect: MiniChampSelectModel | null;
};

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
  champSelectSession: ChampSelectSessionData | null,
  matchmakingSearch: MatchmakingSearchData | null,
  gameflowSession: OngoingGameUpdated["gameflow_session"],
): number | null {
  return (
    effectiveQueueId ??
    champSelectSession?.queueId ??
    matchmakingSearch?.queueId ??
    gameflowSession?.gameData.queue.id ??
    null
  );
}

function normalizePositiveId(value: number | null | undefined): number | null {
  return typeof value === "number" && value > 0 ? value : null;
}

function localPlayerFromSession(
  session: ChampSelectSessionData,
): TeamMember | null {
  if (session.localPlayerCellId < 0) {
    return null;
  }

  return (
    session.myTeam.find(
      (member) => member.cellId === session.localPlayerCellId,
    ) ?? null
  );
}

function selectedChampionIdFromMember(
  member: TeamMember | null,
): number | null {
  return (
    normalizePositiveId(member?.championId) ??
    normalizePositiveId(member?.championPickIntent)
  );
}

function benchChampionsFromSession(
  session: ChampSelectSessionData,
): BenchChampion[] {
  return session.benchChampions.filter(
    (champion) => normalizePositiveId(champion.championId) !== null,
  );
}

function champSelectModelFromSession(
  session: ChampSelectSessionData | null,
): MiniChampSelectModel | null {
  if (!session || session.isSpectating) {
    return null;
  }

  const localPlayer = localPlayerFromSession(session);
  if (!localPlayer) {
    return null;
  }

  const selectedChampionId = selectedChampionIdFromMember(localPlayer);
  const benchChampions = benchChampionsFromSession(session);

  return {
    session,
    mode:
      session.benchEnabled && benchChampions.length > 0 ? "bench" : "default",
    queueId: normalizePositiveId(session.queueId),
    localPlayer,
    selectedChampionId,
    benchChampions,
  };
}

function isSpectatingFromState(
  champSelectSession: ChampSelectSessionData | null,
  gameflowSession: OngoingGameUpdated["gameflow_session"],
): boolean {
  if (champSelectSession?.isSpectating) {
    return true;
  }

  const gameClient = gameflowSession?.gameClient;
  return Boolean(gameClient?.observerServerIp && !gameClient.serverIp);
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
  const champSelectSession = useOngoingGameStore(
    (state) => state.champSelectSession,
  );

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
      champSelectSession,
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
      mapIconSrc: preferredLcuMapAsset(knownMap),
      isSpectating: isSpectatingFromState(champSelectSession, gameflowSession),
      readyCheck,
      champSelect: champSelectModelFromSession(champSelectSession),
    };
  }, [
    champSelectSession,
    effectiveQueueId,
    gameflowSession,
    maps,
    matchmakingSearch,
    phase,
    queues,
    readyCheck,
  ]);
}
