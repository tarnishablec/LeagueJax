import { invoke } from "@tauri-apps/api/core";
import type { Accessor } from "solid-js";
import { createMemo, onMount } from "solid-js";
import type {
  BenchChampion,
  ChampSelectSessionData,
  MatchmakingSearchData,
  TeamMember,
} from "@/bindings/lcu_events";
import type { OngoingGameUpdated } from "@/bindings/ongoing_game";
import type { LcuQueue } from "@/bindings/queues";
import { useSolidOngoingGameStore } from "@/features/ongoing-game/store";
import { useSolidLcuMapQuery } from "@/hooks/use-lcu-maps";
import { useSolidLcuQueues } from "@/hooks/use-lcu-queues";
import {
  type LcuMapAssetSource,
  preferredLcuMapAsset,
} from "@/utils/lcu-map-assets";

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
  queueIconSrc: string | null;
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

export function resolveMiniQueueIconSrc(
  knownMap: LcuMapAssetSource | null | undefined,
  gameflowMap: LcuMapAssetSource | null | undefined,
): string | null {
  return preferredLcuMapAsset(knownMap) ?? preferredLcuMapAsset(gameflowMap);
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

export function useSolidMiniWindowModel(): Accessor<MiniWindowModel> {
  const { data: queues } = useSolidLcuQueues();

  const phase = useSolidOngoingGameStore((state) => state.phase);
  const effectiveQueueId = useSolidOngoingGameStore(
    (state) => state.effectiveQueueId,
  );
  const gameflowSession = useSolidOngoingGameStore(
    (state) => state.gameflowSession,
  );
  const matchmakingSearch = useSolidOngoingGameStore(
    (state) => state.matchmakingSearch,
  );
  const readyCheck = useSolidOngoingGameStore((state) => state.readyCheck);
  const champSelectSession = useSolidOngoingGameStore(
    (state) => state.champSelectSession,
  );

  onMount(() => {
    void invoke<OngoingGameUpdated>("ongoing_game_get_snapshot")
      .then((snapshot) => {
        useSolidOngoingGameStore.getState().applyUpdated(snapshot);
      })
      .catch(() => {});
  });

  const gameflowMap = createMemo(() => gameflowSession()?.map ?? null);
  const gameflowMapMutators = createMemo(() => [
    gameflowMap()?.gameMutator ?? "",
    gameflowSession()?.gameData.queue.assetMutator ?? "",
  ]);
  const { data: knownMap } = useSolidLcuMapQuery(
    () => gameflowMap()?.id ?? 0,
    gameflowMapMutators,
    () => gameflowMap()?.gameMode ?? "",
  );

  return createMemo(() => {
    const queueId = queueIdFromState(
      effectiveQueueId(),
      champSelectSession(),
      matchmakingSearch(),
      gameflowSession(),
    );

    return {
      phase: phase(),
      queueName: queueNameForId(queues(), queueId),
      queueIconSrc: resolveMiniQueueIconSrc(knownMap(), gameflowMap()),
      isSpectating: isSpectatingFromState(
        champSelectSession(),
        gameflowSession(),
      ),
      readyCheck: readyCheck(),
      champSelect: champSelectModelFromSession(champSelectSession()),
    };
  });
}
