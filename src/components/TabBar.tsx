import { X } from "lucide-react";
import type React from "react";
import { useTabStore } from "../stores/tabs";
import * as s from "./TabBar.css";

export function TabBar() {
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
          <div className={s.tabIconFallback} />
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
