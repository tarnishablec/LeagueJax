import { invoke } from "@tauri-apps/api/core";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OngoingGameMatchHistoryFilter } from "@/bindings/ongoing_game";
import { createListCollection, SettingsSelect } from "@/components/settings-ui";
import { useOngoingGameStore } from "../store";
import * as s from "./OngoingGameTitlebar.css";

function sideLabel(
  side: "Blue" | "Red" | null,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string {
  if (side === "Blue") {
    return t("ongoingGame.titlebar.sideBlue", { defaultValue: "Blue Side" });
  }
  if (side === "Red") {
    return t("ongoingGame.titlebar.sideRed", { defaultValue: "Red Side" });
  }
  return t("ongoingGame.titlebar.sideUnknown", {
    defaultValue: "Unknown Side",
  });
}

export function OngoingGameTitlebar() {
  const { t } = useTranslation();
  const {
    phase,
    loading,
    ourSide,
    queueName,
    queueShortName,
    mapName,
    gameModeName,
    gameModeShortName,
    matchHistoryFilter,
  } = useOngoingGameStore();
  const [refreshing, setRefreshing] = useState(false);
  const [updatingFilter, setUpdatingFilter] = useState(false);

  const modeText =
    gameModeName ??
    gameModeShortName ??
    queueShortName ??
    queueName ??
    t("ongoingGame.titlebar.modeUnknown", { defaultValue: "Unknown Mode" });
  const mapText =
    mapName ??
    t("ongoingGame.titlebar.mapUnknown", { defaultValue: "Unknown Map" });
  const teamText = sideLabel(ourSide, t);

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

  const busy = loading || refreshing || updatingFilter;

  return (
    <div className={s.root} data-tauri-drag-region>
      <div className={s.labels}>
        {phase === "Idle" && !loading ? (
          <span className={s.idleText}>
            {t("ongoingGame.titlebar.idle", { defaultValue: "No active game" })}
          </span>
        ) : (
          <>
            <span className={s.text}>{modeText}</span>
            <span className={s.separator}>·</span>
            <span className={s.text}>{mapText}</span>
            <span className={s.separator}>·</span>
            <span className={s.text}>{teamText}</span>
          </>
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
