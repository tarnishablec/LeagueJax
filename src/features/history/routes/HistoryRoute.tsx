import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import { useTabStore } from "@/stores/tabs";
import { MatchList } from "../components/MatchList";
import { SummaryBar } from "../components/SummaryBar";
import * as s from "./HistoryRoute.css";

const ConnectionGuard = ({ instances }: { instances: LcuInstanceInfo[] }) => {
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
};

const EmptyState = () => {
  const { t } = useTranslation();
  return <div className={s.emptyState}>{t("history.emptyState")}</div>;
};

export function HistoryRoute() {
  const connected = useLcuStore(selectIsFocused);
  const { instances } = useLcuStore();
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  if (!connected) {
    return <ConnectionGuard instances={instances} />;
  }

  if (!activeTab) {
    return <EmptyState />;
  }

  return (
    <div className={s.page}>
      <SummaryBar summoner={activeTab.summoner} />
      <MatchList puuid={activeTab.puuid} />
    </div>
  );
}
