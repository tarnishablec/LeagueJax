import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OngoingGameMatchHistoryFilter } from "@/bindings/ongoing_game";
import { LcuImage } from "@/components/LcuImage";
import { createListCollection, SettingsSelect } from "@/components/settings-ui";
import { useOngoingGameStore } from "../store";
import * as s from "./OngoingGameTitlebar.css";

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
  const { phase, gameflowSession, matchHistoryFilter } = useOngoingGameStore();
  const [refreshing, setRefreshing] = useState(false);
  const [updatingFilter, setUpdatingFilter] = useState(false);

  const queueDesc = gameflowSession?.gameData.queue.detailedDescription;
  const queueIconPath = useMemo(
    () => resolveGameflowAssetIconPath(gameflowSession?.map.assets),
    [gameflowSession?.map.assets],
  );

  const filterOptions = useMemo(
    () => [
      {
        value: "CurrentMode",
        label: t("ongoingGame.titlebar.filterCurrentMode", {
          defaultValue: "Current Mode",
        }),
      },
      {
        value: "All",
        label: t("ongoingGame.titlebar.filterAllModes", {
          defaultValue: "All Modes",
        }),
      },
    ],
    [t],
  );
  const filterCollection = useMemo(
    () => createListCollection({ items: filterOptions }),
    [filterOptions],
  );

  const busy = refreshing || updatingFilter;

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
            collection={filterCollection}
            value={[matchHistoryFilter]}
            onValueChange={(details) => {
              const next = details.value[0] as
                | OngoingGameMatchHistoryFilter
                | undefined;
              if (!next || next === matchHistoryFilter) {
                return;
              }

              setUpdatingFilter(true);
              void invoke("ongoing_game_set_match_history_filter", {
                filter: next,
              }).finally(() => {
                setUpdatingFilter(false);
              });
            }}
            disabled={busy}
          />
        </div>

        <button
          type="button"
          className={s.refreshButton}
          aria-label={t("ongoingGame.titlebar.refreshAria", {
            defaultValue: "Refresh ongoing game",
          })}
          disabled={busy}
          onClick={() => {
            setRefreshing(true);
            void invoke("ongoing_game_refresh").finally(() => {
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
