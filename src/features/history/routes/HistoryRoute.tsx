import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { LazyImage } from "@/components/LazyImage";
import { useSettings } from "@/features/settings/context";
import { useDragonStaticData } from "@/hooks/use-dragon-static-data";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import { useTabStore } from "@/stores/tabs";
import { ConnectionGuard } from "../components/ConnectionGuard";
import { MatchList } from "../components/MatchList";
import { SummaryBar } from "../components/SummaryBar";
import { useFocusSync } from "../hooks/use-focus-sync.ts";
import { useSummonerHydration } from "../hooks/use-summoner-hydration";
import {
  HISTORY_AUTO_OPEN_OWN_TAB_SETTING,
  HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING,
} from "../manifest";
import * as s from "./HistoryRoute.css";

function OwnSummonerButton() {
  const { t } = useTranslation();
  const connected = useLcuStore(selectIsFocused);
  const openTab = useTabStore((state) => state.openTab);
  const summoner = connected?.summoner ?? null;

  const { src: avatarUrl } = useDragonStaticData(
    summoner?.profileIconId
      ? { type: "profile-icon", profileIconId: summoner.profileIconId }
      : { type: "profile-icon", profileIconId: 0 },
  );

  if (!summoner) return null;

  const gameName = summoner.gameName || summoner.name || "Summoner";
  const tagLine = summoner.tagLine || "";

  return (
    <div className={s.focusPicker}>
      <button
        type="button"
        className={s.focusPickerCard}
        onClick={() => openTab(summoner, null)}
      >
        <div className={s.focusPickerHeader}>
          <div className={s.focusPickerAvatarWrap}>
            {avatarUrl ? (
              <LazyImage
                src={avatarUrl}
                alt="Profile icon"
                className={s.focusPickerAvatar}
                fallbackClassName={s.focusPickerAvatarFallback}
              />
            ) : (
              <span className={s.focusPickerAvatarFallback} />
            )}
          </div>
          <div className={s.focusPickerInfo}>
            <span className={s.focusPickerName}>
              {gameName}
              {tagLine ? `#${tagLine}` : ""}
            </span>
            <span className={s.focusPickerDetail}>
              {t("history.viewOwnHistory")}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

export function HistoryRoute() {
  const connected = useLcuStore(selectIsFocused);
  const { instances } = useLcuStore();
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const settings = useSettings();
  const autoOpenOwnTab = useSyncExternalStore(
    (onStoreChange) =>
      settings.subscribe(HISTORY_AUTO_OPEN_OWN_TAB_SETTING, onStoreChange),
    () => settings.get<boolean>(HISTORY_AUTO_OPEN_OWN_TAB_SETTING),
  );
  const autoRefreshOnSwitch = useSyncExternalStore(
    (cb) =>
      settings.subscribe(HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING, cb),
    () =>
      settings.get<boolean>(HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING) ??
      false,
  );

  useFocusSync(connected, autoOpenOwnTab);
  useSummonerHydration(!!connected, activeTab);

  if (!connected) {
    return <ConnectionGuard instances={instances} />;
  }

  if (!activeTab) {
    return <OwnSummonerButton />;
  }

  return (
    <div className={s.page}>
      <SummaryBar summoner={activeTab.summoner} autoRefresh={autoRefreshOnSwitch} />
      <MatchList puuid={activeTab.puuid} sgpServerId={activeTab.sgpServerId} />
    </div>
  );
}
