import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSWRConfig } from "swr";
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

  const pathCandidates = [
    assets["icon-v2"],
    // assets["game-select-icon-default"],
    assets["game-select-icon-active"],
    // assets["game-select-icon-hover"],
  ];
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

export function OngoingGameTitlebar() {
  const { t } = useTranslation();
  const { phase, gameflowSession, modeTag } = useOngoingGameStore();
  const setModeTag = useOngoingGameStore((s) => s.setModeTag);
  const { mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);

  const queueDesc = gameflowSession?.gameData.queue.detailedDescription;
  const queueIconPath = useMemo(
    () => resolveGameflowAssetIconPath(gameflowSession?.map.assets),
    [gameflowSession?.map.assets],
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
      ...modeOptions.map((o) => ({ value: o.value, label: t(o.labelKey) })),
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
        items: modeOptions.map((o) => ({
          value: o.value,
          label: t(o.labelKey),
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
          <span className={s.idleText}>
            {/*{t("ongoingGame.titlebar.idle", { defaultValue: "No active game" })}*/}
          </span>
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
              setModeTag(
                next === CURRENT_MODE_VALUE ? null : (next as MatchModeTag),
              );
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
            void Promise.all([
              invoke("ongoing_game_refresh"),
              mutate(
                (key) =>
                  Array.isArray(key) &&
                  (key[0] === "get_match_summaries" ||
                    key[0] === "ongoing-game:get_summoner_by_puuid"),
              ),
            ]).finally(() => {
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
