/** @jsxImportSource solid-js */
import { keyArray } from "@solid-primitives/keyed";
import { invoke } from "@tauri-apps/api/core";
import { CircleCheck } from "lucide-solid";
import { createMemo, createSignal, Show } from "solid-js";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { useSolidTranslation } from "@/i18n/solid";
import { useSolidChampSelectPickableChampionIds } from "../hooks/use-champ-select-pickable-champion-ids";
import type { MiniWindowModel } from "../hooks/use-mini-window-model";
import { MiniBottomPanel } from "./MiniBottomPanel";
import * as s from "./MiniChampSelectView.css";

type ChampSelectModel = NonNullable<MiniWindowModel["champSelect"]>;

function ChampionIcon(props: {
  championId: number | null;
  selected?: boolean;
}) {
  return (
    <ChampionAvatar
      championId={props.championId}
      imageClassName={
        props.selected ? s.selectedChampionImage : s.benchChampionImage
      }
      fallbackClassName={
        props.selected ? s.selectedChampionFallback : s.benchChampionFallback
      }
      alt={props.championId ? `Champion ${props.championId}` : ""}
    />
  );
}

function SelectedChampion(props: { championId: number | null; label: string }) {
  return (
    <div class={s.selectedColumn}>
      <ChampionIcon championId={props.championId} selected />
      <div class={s.selectedLabel}>
        <span>{props.label}</span>
      </div>
    </div>
  );
}

function BenchChampionPool(props: {
  champSelect: ChampSelectModel;
  pickableChampionIds: number[] | null;
  pendingChampionId: number | null;
  onSwap: (championId: number) => void;
}) {
  const benchButtons = keyArray(
    () => props.champSelect.benchChampions,
    (champion) => String(champion.championId),
    (champion) => {
      const isCurrent = createMemo(
        () => champion().championId === props.champSelect.selectedChampionId,
      );
      const isPending = createMemo(
        () => champion().championId === props.pendingChampionId,
      );
      const isPickable = createMemo(
        () =>
          props.pickableChampionIds === null ||
          props.pickableChampionIds.includes(champion().championId),
      );
      const isUnavailable = createMemo(() => !isCurrent() && !isPickable());

      return (
        <button
          type="button"
          aria-label={`Select champion ${champion().championId}`}
          class={s.benchChampionButton}
          data-current={isCurrent() ? "true" : undefined}
          data-pending={isPending() ? "true" : undefined}
          data-unpickable={isUnavailable() ? "true" : undefined}
          disabled={isPending() || isCurrent() || !isPickable()}
          onClick={() => props.onSwap(champion().championId)}
        >
          <ChampionIcon championId={champion().championId} />
        </button>
      );
    },
  );

  return <div class={s.benchGrid}>{benchButtons()}</div>;
}

function ChampSelectStatus(props: {
  champSelect: ChampSelectModel;
  queueName: string | null;
}) {
  const { t } = useSolidTranslation();
  const title = createMemo(() =>
    props.champSelect.selectedChampionId
      ? t("mini.champSelect.status.completed")
      : t("mini.champSelect.status.pending"),
  );
  const meta = createMemo(
    () =>
      props.queueName ??
      t("mini.queue.unknown", { queueId: props.champSelect.queueId ?? "" }),
  );

  return (
    <section class={s.statusPanel}>
      <div class={s.phaseDot} aria-hidden="true" />
      <div class={s.statusText}>
        <div class={s.statusTitle}>{title()}</div>
        <div class={s.statusMeta}>{meta()}</div>
      </div>
    </section>
  );
}

export function MiniChampSelectView(props: { model: MiniWindowModel }) {
  const { t } = useSolidTranslation();
  const champSelect = createMemo(() => props.model.champSelect);
  const { data: pickableChampionIds } = useSolidChampSelectPickableChampionIds(
    () => champSelect()?.session.gameId ?? null,
    () => champSelect()?.session.counter ?? null,
  );
  const [pendingChampionId, setPendingChampionId] = createSignal<number | null>(
    null,
  );
  const [dodgePending, setDodgePending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const selectedLabel = createMemo(() =>
    champSelect()?.selectedChampionId
      ? t("mini.champSelect.selected")
      : t("mini.champSelect.notSelected"),
  );

  const handleSwap = async (championId: number) => {
    if (pendingChampionId() !== null) {
      return;
    }

    setError(null);
    setPendingChampionId(championId);
    try {
      await invoke("lcu_champ_select_swap_bench_champion", { championId });
      await invoke("ongoing_game_refresh");
    } catch {
      setError(t("mini.champSelect.swapFailed"));
    } finally {
      setPendingChampionId(null);
    }
  };

  const handleDodge = async () => {
    const currentChampSelect = champSelect();
    if (!currentChampSelect) {
      return;
    }

    const startedAt = performance.now();
    const context = {
      gameId: currentChampSelect.session.gameId,
      phase: props.model.phase,
      queueId: currentChampSelect.queueId,
      selectedChampionId: currentChampSelect.selectedChampionId,
      pending: dodgePending(),
    };
    console.info("[mini-champ-select] dodge click", context);

    if (dodgePending()) {
      console.info("[mini-champ-select] dodge ignored because pending", {
        ...context,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
      return;
    }

    setError(null);
    setDodgePending(true);
    try {
      console.info(
        "[mini-champ-select] invoke lcu_dodge_champ_select start",
        context,
      );
      await invoke("lcu_dodge_champ_select");
      console.info(
        "[mini-champ-select] invoke lcu_dodge_champ_select success",
        {
          ...context,
          elapsedMs: Math.round(performance.now() - startedAt),
        },
      );
      console.info("[mini-champ-select] invoke ongoing_game_refresh start", {
        ...context,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
      await invoke("ongoing_game_refresh");
      console.info("[mini-champ-select] invoke ongoing_game_refresh success", {
        ...context,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
    } catch (caughtError) {
      console.error("[mini-champ-select] dodge failed", {
        ...context,
        elapsedMs: Math.round(performance.now() - startedAt),
        error: caughtError,
      });
      setError(t("mini.champSelect.dodge.failed"));
    } finally {
      setDodgePending(false);
    }
  };

  return (
    <Show when={champSelect()}>
      {(currentChampSelect) => (
        <section class={s.root}>
          <Show
            when={currentChampSelect().mode === "bench"}
            fallback={
              <section class={s.defaultPanel}>
                <ChampionIcon
                  championId={currentChampSelect().selectedChampionId}
                  selected
                />
                <div class={s.selectedLabel}>
                  <CircleCheck size={14} aria-hidden="true" />
                  <span>{selectedLabel()}</span>
                </div>
              </section>
            }
          >
            <section class={s.benchPanel}>
              <SelectedChampion
                championId={currentChampSelect().selectedChampionId}
                label={selectedLabel()}
              />
              <BenchChampionPool
                champSelect={currentChampSelect()}
                pickableChampionIds={pickableChampionIds() ?? null}
                pendingChampionId={pendingChampionId()}
                onSwap={handleSwap}
              />
            </section>
          </Show>

          <ChampSelectStatus
            champSelect={currentChampSelect()}
            queueName={props.model.queueName}
          />
          <div class={s.spacer} />
          <MiniBottomPanel
            model={props.model}
            champSelectDodge={{
              pending: dodgePending(),
              error: error(),
              onDodge: handleDodge,
            }}
          />
        </section>
      )}
    </Show>
  );
}
