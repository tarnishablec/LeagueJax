import { Menu } from "@ark-ui/react/menu";
import { Portal } from "@ark-ui/react/portal";
import { X } from "lucide-react";
import {
  type MouseEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { LazyImage } from "@/components/LazyImage";
import { useSummonerInfo } from "@/features/history/hooks/use-summoner";
import { useCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import { useTabStore } from "@/stores/tabs.ts";
import * as s from "./HistoryTabBar.css.ts";

function TabIcon({ profileIconId }: { profileIconId: number }) {
  const { src: avatarUrl } = useCdragonStaticData({
    type: "profile-icon",
    profileIconId,
  });

  if (!avatarUrl) {
    return <span className={s.tabIconFallback} aria-hidden="true" />;
  }

  return (
    <LazyImage
      src={avatarUrl}
      alt="Profile icon"
      className={s.tabIcon}
      fallbackClassName={s.tabIconFallback}
      loadingClassName={s.tabIconFallback}
    />
  );
}

type TabRefsMap = Record<string, HTMLLIElement | null>;

function formatTabLabel(
  summoner: { gameName: string; tagLine: string } | undefined,
  puuid: string,
): string {
  if (!summoner) {
    return puuid.slice(0, 8);
  }

  if (summoner.tagLine) {
    return `${summoner.gameName}#${summoner.tagLine}`;
  }

  return summoner.gameName;
}

function getHorizontalWheelDelta(event: WheelEvent): number {
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    return event.deltaY;
  }

  return event.deltaX;
}

function useWheelToHorizontalScroll(
  viewportRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      const horizontalDelta = getHorizontalWheelDelta(event);
      if (horizontalDelta === 0) {
        return;
      }

      const hasOverflow = viewport.scrollWidth > viewport.clientWidth + 1;
      if (!hasOverflow) {
        return;
      }

      event.preventDefault();
      viewport.scrollBy({
        // Vertical mouse-wheel should be able to move a horizontal tab strip.
        left: horizontalDelta,
        behavior: "auto",
      });
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
    };
  }, [viewportRef]);
}

function useAutoScrollToActiveTab(
  activeTabId: string | null,
  tabRefs: RefObject<TabRefsMap>,
) {
  useEffect(() => {
    if (!activeTabId) {
      return;
    }

    const target = tabRefs.current[activeTabId];
    target?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeTabId, tabRefs]);
}

function useTabBarOverflow(
  activeTabId: string | null,
  tabRefs: RefObject<TabRefsMap>,
) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useWheelToHorizontalScroll(viewportRef);
  useAutoScrollToActiveTab(activeTabId, tabRefs);

  return {
    viewportRef,
  };
}

interface HistoryTabItemProps {
  active: boolean;
  tabId: string;
  puuid: string;
  onAuxClick: (e: MouseEvent, id: string) => void;
  registerRef: (id: string, node: HTMLLIElement | null) => void;
}

function HistoryTabItem({
  active,
  tabId,
  puuid,
  onAuxClick,
  registerRef,
}: HistoryTabItemProps) {
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const closeTab = useTabStore((state) => state.closeTab);
  const { data: summoner } = useSummonerInfo(puuid);

  return (
    <li
      ref={(node) => registerRef(tabId, node)}
      data-history-tab-id={tabId}
      className={s.tab({ active })}
    >
      <button
        type="button"
        className={s.tabMain}
        onClick={() => setActiveTab(tabId)}
        onAuxClick={(e) => onAuxClick(e, tabId)}
      >
        <TabIcon profileIconId={summoner?.profileIconId ?? 0} />
        <span className={s.tabLabel}>{formatTabLabel(summoner, puuid)}</span>
      </button>
      <button
        type="button"
        className={s.closeButton}
        aria-label="Close tab"
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tabId);
        }}
      >
        <X size={12} />
      </button>
    </li>
  );
}

function getContextTabId(event: MouseEvent<HTMLUListElement>): string | null {
  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }

  return (
    target.closest<HTMLElement>("[data-history-tab-id]")?.dataset
      .historyTabId ?? null
  );
}

export function HistoryTabBar() {
  const { t } = useTranslation();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const closeTab = useTabStore((state) => state.closeTab);
  const closeTabsToRight = useTabStore((state) => state.closeTabsToRight);
  const closeOtherTabs = useTabStore((state) => state.closeOtherTabs);
  const closeAllTabs = useTabStore((state) => state.closeAllTabs);
  const tabRefs = useRef<TabRefsMap>({});
  const [contextTabId, setContextTabId] = useState<string | null>(null);

  const sortedTabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);
  const { viewportRef } = useTabBarOverflow(activeTabId, tabRefs);

  useEffect(() => {
    const keep = new Set(sortedTabIds);
    for (const id of Object.keys(tabRefs.current)) {
      if (!keep.has(id)) {
        delete tabRefs.current[id];
      }
    }
  }, [sortedTabIds]);

  const handleAuxClick = (e: MouseEvent, id: string) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(id);
    }
  };

  const handleTrackContextMenu = (event: MouseEvent<HTMLUListElement>) => {
    setContextTabId(getContextTabId(event));
  };

  const handleCloseTabsToRight = () => {
    if (contextTabId) {
      closeTabsToRight(contextTabId);
    }
  };

  const handleCloseOtherTabs = () => {
    if (contextTabId) {
      closeOtherTabs(contextTabId);
    }
  };

  return (
    <Menu.Root positioning={{ placement: "bottom-start", strategy: "fixed" }}>
      <div className={s.container}>
        <div data-tauri-drag-region className={s.viewport} ref={viewportRef}>
          <Menu.ContextTrigger asChild>
            <ul className={s.track} onContextMenu={handleTrackContextMenu}>
              {tabs.map((tab) => (
                <HistoryTabItem
                  key={tab.id}
                  active={tab.id === activeTabId}
                  tabId={tab.id}
                  puuid={tab.puuid}
                  onAuxClick={handleAuxClick}
                  registerRef={(id, node) => {
                    tabRefs.current[id] = node;
                  }}
                />
              ))}
            </ul>
          </Menu.ContextTrigger>
        </div>
      </div>
      <Portal>
        <Menu.Positioner className={s.contextMenuPositioner}>
          <Menu.Content className={s.contextMenuContent}>
            <Menu.Item
              className={s.contextMenuItem}
              value="close-right"
              onSelect={handleCloseTabsToRight}
              disabled={!contextTabId}
            >
              {t("history.closeTabsToRight")}
            </Menu.Item>
            <Menu.Item
              className={s.contextMenuItem}
              value="close-others"
              onSelect={handleCloseOtherTabs}
              disabled={!contextTabId}
            >
              {t("history.closeOtherTabs")}
            </Menu.Item>
            <Menu.Separator className={s.contextMenuSeparator} />
            <Menu.Item
              className={s.contextMenuItem}
              value="close-all"
              onSelect={() => closeAllTabs()}
            >
              {t("history.closeAllTabs")}
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
