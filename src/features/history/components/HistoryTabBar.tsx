import { X } from "lucide-react";
import type React from "react";
import type { SummonerInfo } from "@/bindings/summoner";
import { useProfileIcon } from "@/hooks/use-profile-icon";
import { useTabStore } from "@/stores/tabs.ts";
import * as s from "./HistoryTabBar.css.ts";

function TabIcon({ summoner }: { summoner: SummonerInfo }) {
  const avatarUrl = useProfileIcon(summoner.profileIconId);

  if (!avatarUrl) {
    return <div className={s.tabIconFallback} />;
  }

  return (
    <img
      src={avatarUrl}
      alt="Profile icon"
      className={s.tabIcon}
      loading="lazy"
      decoding="async"
    />
  );
}

export function HistoryTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabStore();

  if (tabs.length === 0) return <div />;

  const handleAuxClick = (e: React.MouseEvent, id: string) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(id);
    }
  };

  return (
    <div className={s.container}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={s.tab({ active: tab.id === activeTabId })}
          onClick={() => setActiveTab(tab.id)}
          onAuxClick={(e) => handleAuxClick(e, tab.id)}
        >
          <TabIcon summoner={tab.summoner} />
          <span className={s.tabLabel}>
            {tab.summoner.gameName}#{tab.summoner.tagLine}
          </span>
          <button
            type="button"
            className={s.closeButton}
            aria-label="Close tab"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
          >
            <X size={12} />
          </button>
        </button>
      ))}
    </div>
  );
}
