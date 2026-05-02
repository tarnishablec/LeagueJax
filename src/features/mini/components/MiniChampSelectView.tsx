import { invoke } from "@tauri-apps/api/core";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChampionAvatar } from "@/components/champion-avatar/ChampionAvatar";
import { useChampSelectPickableChampionIds } from "../hooks/use-champ-select-pickable-champion-ids";
import type { MiniWindowModel } from "../hooks/use-mini-window-model";
import { MiniChampSelectDodgeSection } from "./MiniChampSelectDodgeSection";
import * as s from "./MiniChampSelectView.css";

type ChampSelectModel = NonNullable<MiniWindowModel["champSelect"]>;

function ChampionIcon({
  championId,
  selected = false,
}: {
  championId: number | null;
  selected?: boolean;
}) {
  return (
    <ChampionAvatar
      championId={championId}
      imageClassName={selected ? s.selectedChampionImage : s.benchChampionImage}
      fallbackClassName={
        selected ? s.selectedChampionFallback : s.benchChampionFallback
      }
      alt={championId ? `Champion ${championId}` : ""}
    />
  );
}

function SelectedChampion({
  championId,
  label,
}: {
  championId: number | null;
  label: string;
}) {
  return (
    <div className={s.selectedColumn}>
      <ChampionIcon championId={championId} selected />
      <div className={s.selectedLabel}>
        <span>{label}</span>
      </div>
    </div>
  );
}

function BenchChampionPool({
  champSelect,
  pickableChampionIds,
  pendingChampionId,
  onSwap,
}: {
  champSelect: ChampSelectModel;
  pickableChampionIds: number[] | null;
  pendingChampionId: number | null;
  onSwap: (championId: number) => void;
}) {
  return (
    <div className={s.benchGrid}>
      {champSelect.benchChampions.map((champion) => {
        const isCurrent =
          champion.championId === champSelect.selectedChampionId;
        const isPending = champion.championId === pendingChampionId;
        const isPickable =
          pickableChampionIds === null ||
          pickableChampionIds.includes(champion.championId);
        const isUnavailable = !isCurrent && !isPickable;

        return (
          <button
            key={champion.championId}
            type="button"
            aria-label={`Select champion ${champion.championId}`}
            className={s.benchChampionButton}
            data-current={isCurrent ? "true" : undefined}
            data-pending={isPending ? "true" : undefined}
            data-unpickable={isUnavailable ? "true" : undefined}
            disabled={pendingChampionId !== null || isCurrent || !isPickable}
            onClick={() => onSwap(champion.championId)}
          >
            <ChampionIcon championId={champion.championId} />
          </button>
        );
      })}
    </div>
  );
}

function ChampSelectStatus({
  champSelect,
  queueName,
}: {
  champSelect: ChampSelectModel;
  queueName: string | null;
}) {
  const { t } = useTranslation();
  const title = champSelect.selectedChampionId
    ? t("mini.champSelect.status.completed", {
        defaultValue: "英雄选择（已完成）",
      })
    : t("mini.champSelect.status.pending", {
        defaultValue: "英雄选择",
      });
  const meta =
    queueName ??
    t("mini.queue.unknown", {
      queueId: champSelect.queueId,
      defaultValue: "当前队列",
    });

  return (
    <section className={s.statusPanel}>
      <div className={s.phaseDot} aria-hidden="true" />
      <div className={s.statusText}>
        <div className={s.statusTitle}>{title}</div>
        <div className={s.statusMeta}>{meta}</div>
      </div>
    </section>
  );
}

export function MiniChampSelectView({ model }: { model: MiniWindowModel }) {
  const { t } = useTranslation();
  const champSelect = model.champSelect;
  const { data: pickableChampionIds } = useChampSelectPickableChampionIds(
    champSelect?.session.gameId || null,
  );
  const [pendingChampionId, setPendingChampionId] = useState<number | null>(
    null,
  );
  const [dodgePending, setDodgePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!champSelect) {
    return null;
  }

  const resolvedPickableChampionIds = pickableChampionIds ?? null;

  const selectedLabel = champSelect.selectedChampionId
    ? t("mini.champSelect.selected", {
        defaultValue: "已选择",
      })
    : t("mini.champSelect.notSelected", {
        defaultValue: "未选择",
      });

  const handleSwap = async (championId: number) => {
    if (pendingChampionId !== null) {
      return;
    }

    setError(null);
    setPendingChampionId(championId);
    try {
      await invoke("lcu_champ_select_swap_bench_champion", { championId });
      await invoke("ongoing_game_refresh");
    } catch {
      setError(
        t("mini.champSelect.swapFailed", {
          defaultValue: "切换英雄失败",
        }),
      );
    } finally {
      setPendingChampionId(null);
    }
  };

  const handleDodge = async () => {
    const startedAt = performance.now();
    const context = {
      gameId: champSelect.session.gameId,
      phase: model.phase,
      queueId: champSelect.queueId,
      selectedChampionId: champSelect.selectedChampionId,
      pending: dodgePending,
    };
    console.info("[mini-champ-select] dodge click", context);

    if (dodgePending) {
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
    } catch (error) {
      console.error("[mini-champ-select] dodge failed", {
        ...context,
        elapsedMs: Math.round(performance.now() - startedAt),
        error,
      });
      setError(
        t("mini.champSelect.dodge.failed", {
          defaultValue: "退出英雄选择失败",
        }),
      );
    } finally {
      setDodgePending(false);
    }
  };

  return (
    <section className={s.root}>
      {champSelect.mode === "bench" ? (
        <section className={s.benchPanel}>
          <SelectedChampion
            championId={champSelect.selectedChampionId}
            label={selectedLabel}
          />
          <BenchChampionPool
            champSelect={champSelect}
            pickableChampionIds={resolvedPickableChampionIds}
            pendingChampionId={pendingChampionId}
            onSwap={handleSwap}
          />
        </section>
      ) : (
        <section className={s.defaultPanel}>
          <ChampionIcon championId={champSelect.selectedChampionId} selected />
          <div className={s.selectedLabel}>
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>{selectedLabel}</span>
          </div>
        </section>
      )}

      <ChampSelectStatus
        champSelect={champSelect}
        queueName={model.queueName}
      />
      <div className={s.spacer} />
      <MiniChampSelectDodgeSection
        pending={dodgePending}
        error={error}
        onDodge={handleDodge}
      />
    </section>
  );
}
