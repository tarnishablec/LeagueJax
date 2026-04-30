import { Menu } from "@ark-ui/react/menu";
import { Portal } from "@ark-ui/react/portal";
import { X } from "lucide-react";
import {
  type MouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { SummonerInfo } from "@/bindings/summoner";
import { useCdragonStaticData } from "@/hooks/use-cdragon-static-data";
import { useTabStore } from "@/stores/tabs.ts";
import * as s from "./HistoryTabBar.css.ts";

function TabIcon({ summoner }: { summoner: SummonerInfo }) {
  const { src: avatarUrl } = useCdragonStaticData({
    type: "profile-icon",
    profileIconId: summoner.profileIconId,
  });

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

type TabRefsMap = Record<string, HTMLDivElement | null>;
type OverflowState = {
  showLeftOverflow: boolean;
  showRightOverflow: boolean;
};

function formatTabLabel(summoner: SummonerInfo): string {
  if (summoner.tagLine) {
    return `${summoner.gameName}#${summoner.tagLine}`;
  }

  return summoner.gameName;
}

function computeOverflowState(viewport: HTMLDivElement): OverflowState {
  const hasOverflow = viewport.scrollWidth > viewport.clientWidth + 1;
  if (!hasOverflow) {
    return {
      showLeftOverflow: false,
      showRightOverflow: false,
    };
  }

  const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
  return {
    showLeftOverflow: viewport.scrollLeft > 1,
    showRightOverflow: viewport.scrollLeft < maxScrollLeft - 1,
  };
}

function isOverflowStateEqual(
  left: OverflowState,
  right: OverflowState,
): boolean {
  return (
    left.showLeftOverflow === right.showLeftOverflow &&
    left.showRightOverflow === right.showRightOverflow
  );
}

function getHorizontalWheelDelta(event: WheelEvent): number {
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
    return event.deltaY;
  }

  return event.deltaX;
}

function useOverflowIndicators(
  containerRef: RefObject<HTMLDivElement | null>,
  viewportRef: RefObject<HTMLDivElement | null>,
  trackRef: RefObject<HTMLDivElement | null>,
): OverflowState {
  const [state, setState] = useState<OverflowState>({
    showLeftOverflow: false,
    showRightOverflow: false,
  });

  const updateOverflow = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const nextState = computeOverflowState(viewport);
    setState((currentState) =>
      isOverflowStateEqual(currentState, nextState) ? currentState : nextState,
    );
  }, [viewportRef]);

  useEffect(() => {
    const container = containerRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!container || !viewport || !track) {
      return;
    }

    const onScroll = () => updateOverflow();
    updateOverflow();

    viewport.addEventListener("scroll", onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(container);
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);

    const mutationObserver = new MutationObserver(updateOverflow);
    mutationObserver.observe(track, {
      childList: true,
    });

    return () => {
      viewport.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef, viewportRef, trackRef, updateOverflow]);

  return state;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { showLeftOverflow, showRightOverflow } = useOverflowIndicators(
    containerRef,
    viewportRef,
    trackRef,
  );

  useWheelToHorizontalScroll(viewportRef);
  useAutoScrollToActiveTab(activeTabId, tabRefs);

  return {
    containerRef,
    viewportRef,
    trackRef,
    showLeftOverflow,
    showRightOverflow,
  };
}

interface HistoryTabItemProps {
  active: boolean;
  tabId: string;
  summoner: SummonerInfo;
  onAuxClick: (e: MouseEvent, id: string) => void;
  registerRef: (id: string, node: HTMLDivElement | null) => void;
}

function HistoryTabItem({
  active,
  tabId,
  summoner,
  onAuxClick,
  registerRef,
}: HistoryTabItemProps) {
  const { t } = useTranslation();
  const {
    setActiveTab,
    closeTab,
    closeTabsToRight,
    closeOtherTabs,
    closeAllTabs,
  } = useTabStore();

  return (
    <Menu.Root positioning={{ placement: "bottom-start", strategy: "fixed" }}>
      <Menu.ContextTrigger asChild>
        <div
          ref={(node) => registerRef(tabId, node)}
          className={s.tab({ active })}
        >
          <button
            type="button"
            className={s.tabMain}
            onClick={() => setActiveTab(tabId)}
            onAuxClick={(e) => onAuxClick(e, tabId)}
          >
            <TabIcon summoner={summoner} />
            <span className={s.tabLabel}>{formatTabLabel(summoner)}</span>
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
        </div>
      </Menu.ContextTrigger>
      <Portal>
        <Menu.Positioner className={s.contextMenuPositioner}>
          <Menu.Content className={s.contextMenuContent}>
            <Menu.Item
              className={s.contextMenuItem}
              value={`close-right-${tabId}`}
              onSelect={() => closeTabsToRight(tabId)}
            >
              {t("history.closeTabsToRight")}
            </Menu.Item>
            <Menu.Item
              className={s.contextMenuItem}
              value={`close-others-${tabId}`}
              onSelect={() => closeOtherTabs(tabId)}
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

export function HistoryTabBar() {
  const { tabs, activeTabId, closeTab } = useTabStore();
  const tabRefs = useRef<TabRefsMap>({});

  const sortedTabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);
  const {
    containerRef,
    viewportRef,
    trackRef,
    showLeftOverflow,
    showRightOverflow,
  } = useTabBarOverflow(activeTabId, tabRefs);

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

  return (
    <div className={s.container} ref={containerRef}>
      <div data-tauri-drag-region className={s.viewport} ref={viewportRef}>
        <div className={s.track} ref={trackRef}>
          {tabs.map((tab) => (
            <HistoryTabItem
              key={tab.id}
              active={tab.id === activeTabId}
              tabId={tab.id}
              summoner={tab.summoner}
              onAuxClick={handleAuxClick}
              registerRef={(id, node) => {
                tabRefs.current[id] = node;
              }}
            />
          ))}
        </div>
      </div>
      <div
        className={s.overflowFade({
          side: "left",
          visible: showLeftOverflow,
        })}
        aria-hidden="true"
      />
      <div
        className={s.overflowFade({
          side: "right",
          visible: showRightOverflow,
        })}
        aria-hidden="true"
      />
    </div>
  );
}
