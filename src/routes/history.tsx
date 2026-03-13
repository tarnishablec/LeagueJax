import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { LcuInstanceInfo } from "@/bindings/lcu.ts";
import { MatchList } from "../features/history/components/MatchList";
import { SummaryBar } from "../features/history/components/SummaryBar";
import { selectIsFocused, useLcuStore } from "../stores/lcu";
import { useTabStore } from "../stores/tabs";
import * as s from "./history.css";

const ConnectionGuard = ({ instances }: { instances: LcuInstanceInfo[] }) => {
  const { t } = useTranslation();
  const readyInstances = instances.filter((i) => i.state === "ready");

  if (readyInstances.length === 0) {
    return <div className={s.emptyState}>{t("common.disconnected")}</div>;
  }

  return (
    <div className={s.focusPicker}>
      <div className={s.focusPickerTitle}>{t("history.selectClient")}</div>
      {readyInstances.map((inst) => (
        <button
          type={"button"}
          key={inst.pid}
          className={s.focusPickerCard}
          onClick={() => invoke("lcu_switch_focus", { pid: inst.pid })}
        >
          <span className={s.focusPickerName}>
            {inst.summoner?.gameName
              ? `${inst.summoner.gameName}#${inst.summoner.tagLine}`
              : `PID: ${inst.pid}`}
          </span>
          <span className={s.focusPickerDetail}>
            <span>{inst.region}</span>
            <span>PID: {inst.pid}</span>
          </span>
          <span>{inst.installDir}</span>
        </button>
      ))}
    </div>
  );
};

function EmptyState() {
  const { t } = useTranslation();
  return <div className={s.emptyState}>{t("history.emptyState")}</div>;
}

export function History() {
  const connected = useLcuStore(selectIsFocused);
  const { instances } = useLcuStore();
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!connected) return <ConnectionGuard instances={instances} />;
  if (!activeTab) return <EmptyState />;

  return (
    <div className={s.page}>
      <SummaryBar summoner={activeTab.summoner} />
      <MatchList puuid={activeTab.puuid} />
    </div>
  );
}

export const Route = createFileRoute("/history")({ component: History });
