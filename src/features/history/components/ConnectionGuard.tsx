import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import * as s from "../routes/HistoryRoute.css";

export function ConnectionGuard({
  instances,
}: {
  instances: LcuInstanceInfo[];
}) {
  const { t } = useTranslation();
  const readyInstances = instances.filter(
    (instance) => instance.state === "ready",
  );

  if (readyInstances.length === 0) {
    return <div className={s.emptyState}>{t("common.disconnected")}</div>;
  }

  return (
    <div className={s.focusPicker}>
      <div className={s.focusPickerTitle}>{t("history.selectClient")}</div>
      {readyInstances.map((instance) => (
        <button
          type="button"
          key={instance.pid}
          className={s.focusPickerCard}
          onClick={() => invoke("lcu_update_focus", { pid: instance.pid })}
        >
          <span className={s.focusPickerName}>
            {instance.summoner?.gameName
              ? `${instance.summoner.gameName}#${instance.summoner.tagLine}`
              : `PID: ${instance.pid}`}
          </span>
          <span className={s.focusPickerDetail}>
            <span>{instance.region}</span>
            <span>PID: {instance.pid}</span>
          </span>
          <span>{instance.installDir}</span>
        </button>
      ))}
    </div>
  );
}
