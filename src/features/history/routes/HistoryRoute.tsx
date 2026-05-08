import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { ProfileIcon } from "@/components/ProfileIcon";
import { useSettings } from "@/features/settings/context";
import { selectIsFocused, useLcuStore } from "@/stores/lcu";
import { useTabStore } from "@/stores/tabs";
import { ConnectionGuard } from "../components/ConnectionGuard";
import { MatchList } from "../components/MatchList";
import { SummaryBar } from "../components/SummaryBar";
import { useOpenHistoryTab } from "../hooks/use-open-history-tab";
import { useSummonerInfo } from "../hooks/use-summoner";
import { HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING } from "../manifest";
import {
  deriveSgpServerIdFromClientArgs,
  deriveSgpServerIdFromRegion,
  formatHistoryServerBadgeLabel,
  resolveHistoryServerId,
} from "../utils/server-display";
import * as s from "./HistoryRoute.css";

function useDeferredListMount(key: string | null): boolean {
  const [readyKey, setReadyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setReadyKey(null);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setReadyKey(key);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [key]);

  return readyKey === key;
}

function OwnSummonerButton({ serverId }: { serverId: string | null }) {
  const { t } = useTranslation();
  const connected = useLcuStore(selectIsFocused);
  const openHistoryTab = useOpenHistoryTab();
  const summoner = connected?.summoner ?? null;

  if (!summoner) return null;

  const gameName = summoner.gameName || summoner.name || "Summoner";
  const tagLine = summoner.tagLine || "";

  return (
    <div className={s.focusPicker}>
      <button
        type="button"
        className={s.focusPickerCard}
        onClick={() =>
          openHistoryTab(summoner.puuid, serverId, {
            gameName,
            tagLine,
            profileIconId: summoner.profileIconId,
            summonerLevel: summoner.summonerLevel,
            privacy: summoner.privacy,
          })
        }
      >
        <div className={s.focusPickerHeader}>
          <div className={s.focusPickerAvatarWrap}>
            <ProfileIcon
              profileIconId={summoner.profileIconId}
              alt="Profile icon"
              className={s.focusPickerAvatar}
              fallbackClassName={s.focusPickerAvatarFallback}
            />
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
  const { t } = useTranslation();
  const connected = useLcuStore(selectIsFocused);
  const { instances } = useLcuStore();
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const listReady = useDeferredListMount(activeTab?.id ?? null);
  const activeTabServerId = resolveHistoryServerId(activeTab?.sgpServerId);
  const focusedServerId =
    deriveSgpServerIdFromClientArgs(connected?.cmdArgs) ??
    deriveSgpServerIdFromRegion(connected?.region);
  const { data: activeSummoner } = useSummonerInfo(
    activeTab?.puuid,
    activeTabServerId,
    activeTab?.identity,
  );
  const activeOwnSummoner =
    activeTab?.puuid !== undefined &&
    connected?.summoner?.puuid === activeTab.puuid;
  const derivedOwnServerId = activeOwnSummoner ? focusedServerId : null;
  const effectiveActiveTabServerId = activeTabServerId ?? derivedOwnServerId;
  const rankUnavailable =
    activeTabServerId !== null &&
    focusedServerId !== null &&
    activeTabServerId !== focusedServerId;
  const summaryServerLabel = formatHistoryServerBadgeLabel(
    effectiveActiveTabServerId,
    t,
  );

  const settings = useSettings();
  const autoRefreshOnSwitch = useSyncExternalStore(
    (cb) => settings.subscribe(HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING, cb),
    () =>
      settings.get<boolean>(HISTORY_AUTO_REFRESH_ON_TAB_SWITCH_SETTING) ??
      false,
  );

  if (!connected) {
    return <ConnectionGuard instances={instances} />;
  }

  if (!activeTab) {
    return <OwnSummonerButton serverId={focusedServerId} />;
  }

  return (
    <div className={s.page}>
      {activeSummoner ? (
        <SummaryBar
          summoner={activeSummoner}
          rankedPuuid={activeTab.puuid}
          rankUnavailable={rankUnavailable}
          serverLabel={summaryServerLabel}
          autoRefresh={autoRefreshOnSwitch}
        />
      ) : (
        <div className={s.summaryPlaceholder} />
      )}
      {listReady ? (
        <MatchList
          puuid={activeTab.puuid}
          sgpServerId={effectiveActiveTabServerId}
        />
      ) : (
        <div className={s.listPlaceholder} />
      )}
    </div>
  );
}
