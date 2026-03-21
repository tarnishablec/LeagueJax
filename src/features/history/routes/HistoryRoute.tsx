import { useTranslation } from "react-i18next";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import { useTabStore } from "@/stores/tabs";
import { ConnectionGuard } from "../components/ConnectionGuard";
import { MatchList } from "../components/MatchList";
import { SummaryBar } from "../components/SummaryBar";
import { useFocusSync } from "../hooks/use-focus-sync";
import { useSummonerHydration } from "../hooks/use-summoner-hydration";
import * as s from "./HistoryRoute.css";

export function HistoryRoute() {
  const { t } = useTranslation();
  const connected = useLcuStore(selectIsFocused);
  const { instances } = useLcuStore();
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  useFocusSync(connected);
  useSummonerHydration(!!connected, activeTab);

  if (!connected) {
    return <ConnectionGuard instances={instances} />;
  }

  if (!activeTab) {
    return <div className={s.emptyState}>{t("history.emptyState")}</div>;
  }

  return (
    <div className={s.page}>
      <SummaryBar summoner={activeTab.summoner} />
      <MatchList puuid={activeTab.puuid} sgpServerId={activeTab.sgpServerId} />
    </div>
  );
}
