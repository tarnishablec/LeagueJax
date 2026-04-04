import { invoke } from "@tauri-apps/api/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LcuImage } from "@/components/LcuImage";
import { RefreshButton } from "@/components/RefreshButton";
import { createListCollection, SettingsSelect } from "@/components/settings-ui";
import { modeOptions } from "@/features/history/components/match-list-options";
import type { MatchModeTag } from "@/features/history/hooks/use-match-history";
import { useLcuQueueName } from "@/hooks/use-lcu-queues";
import { useOngoingGameStore } from "../store";
import * as s from "./OngoingGameTitlebar.css";

const CURRENT_MODE_VALUE = "__current_mode__";

function resolveGameflowAssetIconPath(
  assets: Record<string, unknown> | undefined,
): string | null {
  if (!assets) {
    return null;
  }

  const pathCandidates = [assets["icon-v2"], assets["game-select-icon-active"]];
  const selectedPath = pathCandidates.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  if (!selectedPath) {
    return null;
  }

  const normalizedPath = selectedPath.replace(/\\/g, "/").trim();
  if (normalizedPath.length === 0) {
    return null;
  }

  return normalizedPath;
}

function resolveSgpTag(modeTag: MatchModeTag | null): string | null {
  if (modeTag === null) {
    return CURRENT_MODE_VALUE;
  }
  if (modeTag === "all") {
    return null;
  }
  return modeTag;
}

function resolveSelectedValue(
  modeTag: MatchModeTag | null,
  selectableValues: Set<string>,
): string {
  if (modeTag === null) {
    return CURRENT_MODE_VALUE;
  }

  if (selectableValues.has(modeTag)) {
    return modeTag;
  }

  return "all";
}

export function OngoingGameTitlebar() {
  const { t } = useTranslation();
  const phase = useOngoingGameStore((state) => state.phase);
  const effectiveQueueId = useOngoingGameStore((state) => state.effectiveQueueId);
  const modeTag = useOngoingGameStore((state) => state.modeTag);
  const matchHistoriesPending = useOngoingGameStore(
    (state) => state.matchHistoriesPending,
  );
  const queueIconAssetPath = useOngoingGameStore((state) => {
    const assets = state.gameflowSession?.map.assets;
    if (!assets) {
      return null;
    }

    const pathCandidates = [assets["icon-v2"], assets["game-select-icon-active"]];
    const selectedPath = pathCandidates.find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );
    return selectedPath ?? null;
  });
  const queueDetailedDescription = useOngoingGameStore(
    (state) => state.gameflowSession?.gameData.queue.detailedDescription ?? null,
  );
  const gameModeName = useOngoingGameStore(
    (state) => state.gameflowSession?.map.gameModeName ?? null,
  );
  const setModeTag = useOngoingGameStore((state) => state.setModeTag);

  const queueName = useLcuQueueName(effectiveQueueId ?? 0);
  const queueDesc = queueName || queueDetailedDescription || gameModeName;
  const queueIconPath = useMemo(
    () =>
      queueIconAssetPath
        ? resolveGameflowAssetIconPath({
            "icon-v2": queueIconAssetPath,
          })
        : null,
    [queueIconAssetPath],
  );

  const currentModeLabel = t("ongoingGame.titlebar.filterCurrentMode", {
    defaultValue: "Current Mode",
  });
  const queueGroupLabel = t("ongoingGame.titlebar.filterQueueGroup", {
    defaultValue: "Queues",
  });

  const allItems = useMemo(
    () => [
      { value: CURRENT_MODE_VALUE, label: currentModeLabel },
      ...modeOptions.map((option) => ({
        value: option.value,
        label: t(option.labelKey),
      })),
    ],
    [currentModeLabel, t],
  );

  const collection = useMemo(
    () => createListCollection({ items: allItems }),
    [allItems],
  );

  const selectableValues = useMemo(
    () => new Set(allItems.map((item) => item.value)),
    [allItems],
  );

  const groups = useMemo(
    () => [
      {
        label: currentModeLabel,
        items: [{ value: CURRENT_MODE_VALUE, label: currentModeLabel }],
      },
      {
        label: queueGroupLabel,
        items: modeOptions.map((option) => ({
          value: option.value,
          label: t(option.labelKey),
        })),
      },
    ],
    [currentModeLabel, queueGroupLabel, t],
  );

  const selectedValue = resolveSelectedValue(modeTag, selectableValues);

  return (
    <div className={s.root} data-tauri-drag-region>
      <div className={s.labels}>
        {phase === "Idle" ? (
          <span className={s.idleText} />
        ) : (
          <span className={s.queueMeta}>
            {queueIconPath ? (
              <LcuImage
                src={queueIconPath}
                alt=""
                className={s.queueIcon}
                fallbackClassName={s.queueIconFallback}
              />
            ) : null}
            <span className={s.queueDesc}>{queueDesc}</span>
          </span>
        )}
      </div>

      <div></div>

      <div className={s.controls}>
        <div className={s.filterSelect}>
          <SettingsSelect
            collection={collection}
            groups={groups}
            value={[selectedValue]}
            onValueChange={(details) => {
              const next = details.value[0];
              if (!next) return;
              const nextModeTag =
                next === CURRENT_MODE_VALUE ? null : (next as MatchModeTag);
              const resolvedTag = resolveSgpTag(nextModeTag);

              setModeTag(nextModeTag);
              void invoke("ongoing_game_set_match_history_tag", {
                tag: resolvedTag,
              });
            }}
          />
        </div>

        <RefreshButton
          loading={matchHistoriesPending}
          disabled={phase === "Idle"}
          ariaLabel={t("ongoingGame.titlebar.refreshAria", {
            defaultValue: "Refresh ongoing game",
          })}
          onClick={() => {
            void invoke("ongoing_game_refresh_match_histories");
          }}
        />
      </div>
    </div>
  );
}
