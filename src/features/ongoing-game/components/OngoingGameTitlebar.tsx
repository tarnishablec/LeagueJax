import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LcuImage } from "@/components/LcuImage";
import { createListCollection, SettingsSelect } from "@/components/settings-ui";
import { modeOptions } from "@/features/history/components/match-list-options";
import type { MatchModeTag } from "@/features/history/hooks/use-match-history";
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

function resolveSgpTag(
  modeTag: MatchModeTag | null,
  queueId: number | undefined,
): string | null {
  if (modeTag === null) {
    return queueId ? `q_${queueId}` : null;
  }
  if (modeTag === "all") {
    return null;
  }
  return modeTag;
}

export function OngoingGameTitlebar() {
  const { t } = useTranslation();
  const { phase, gameflowSession, champSelectSession, modeTag } =
    useOngoingGameStore();
  const setModeTag = useOngoingGameStore((state) => state.setModeTag);
  const [refreshing, setRefreshing] = useState(false);

  const queueDesc = gameflowSession?.gameData.queue.detailedDescription;
  const queueIconPath = useMemo(
    () => resolveGameflowAssetIconPath(gameflowSession?.map.assets),
    [gameflowSession?.map.assets],
  );
  const queueId =
    gameflowSession?.gameData.queue.id && gameflowSession.gameData.queue.id > 0
      ? gameflowSession.gameData.queue.id
      : champSelectSession?.queueId;

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

  const selectedValue = modeTag ?? CURRENT_MODE_VALUE;

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
              setModeTag(nextModeTag);
              void invoke("ongoing_game_set_match_history_tag", {
                tag: resolveSgpTag(nextModeTag, queueId),
              });
            }}
            disabled={refreshing}
          />
        </div>

        <button
          type="button"
          className={s.refreshButton}
          aria-label={t("ongoingGame.titlebar.refreshAria", {
            defaultValue: "Refresh ongoing game",
          })}
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            void invoke("ongoing_game_refresh_match_histories").finally(() => {
              setRefreshing(false);
            });
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
}


