/** @jsxImportSource solid-js */
import { Menu } from "@ark-ui/solid/menu";
import { keyArray } from "@solid-primitives/keyed";
import { X } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { ProfileIcon } from "@/components/ProfileIcon";
import { useSolidSummonerInfo } from "@/features/history/hooks/use-summoner";
import { useSolidTranslation } from "@/i18n/solid";
import { type HistoryTabIdentity, useSolidTabStore } from "@/stores/tabs.solid";
import * as s from "./HistoryTabBar.css.ts";

function TabIcon(props: { profileIconId: number }): JSX.Element {
  return (
    <ProfileIcon
      profileIconId={props.profileIconId}
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

function useTabBarOverflow(params: {
  viewport: () => HTMLDivElement | undefined;
  activeTabId: () => string | null;
  tabRefs: TabRefsMap;
}) {
  createEffect(() => {
    const viewport = params.viewport();
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
    onCleanup(() => {
      viewport.removeEventListener("wheel", onWheel);
    });
  });

  createEffect(() => {
    const activeTabId = params.activeTabId();
    if (!activeTabId) {
      return;
    }

    params.tabRefs[activeTabId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  });
}

interface HistoryTabItemProps {
  active: boolean;
  tabId: string;
  puuid: string;
  sgpServerId: string | null;
  identity?: HistoryTabIdentity;
  onAuxClick: (event: MouseEvent, id: string) => void;
  registerRef: (id: string, node: HTMLLIElement | null) => void;
}

function HistoryTabItem(props: HistoryTabItemProps): JSX.Element {
  const setActiveTab = useSolidTabStore((state) => state.setActiveTab);
  const closeTab = useSolidTabStore((state) => state.closeTab);
  const summonerQuery = useSolidSummonerInfo(
    () => props.puuid,
    () => props.sgpServerId,
    () => props.identity,
  );
  const summoner = summonerQuery.data;

  return (
    <li
      ref={(node) => props.registerRef(props.tabId, node)}
      data-history-tab-id={props.tabId}
      class={s.tab({ active: props.active })}
    >
      <button
        type="button"
        class={s.tabMain}
        onClick={() => setActiveTab(props.tabId)}
        onAuxClick={(event) => props.onAuxClick(event, props.tabId)}
      >
        <TabIcon profileIconId={summoner()?.profileIconId ?? 0} />
        <span class={s.tabLabel}>
          {formatTabLabel(summoner(), props.puuid)}
        </span>
      </button>
      <button
        type="button"
        class={s.closeButton}
        aria-label="Close tab"
        onClick={(event) => {
          event.stopPropagation();
          closeTab(props.tabId);
        }}
      >
        <X size={12} />
      </button>
    </li>
  );
}

function getContextTabId(event: MouseEvent): string | null {
  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }

  return (
    target.closest<HTMLElement>("[data-history-tab-id]")?.dataset
      .historyTabId ?? null
  );
}

export function HistoryTabBar(): JSX.Element {
  const { t } = useSolidTranslation();
  const tabs = useSolidTabStore((state) => state.tabs);
  const activeTabId = useSolidTabStore((state) => state.activeTabId);
  const closeTab = useSolidTabStore((state) => state.closeTab);
  const closeTabsToRight = useSolidTabStore((state) => state.closeTabsToRight);
  const closeOtherTabs = useSolidTabStore((state) => state.closeOtherTabs);
  const closeAllTabs = useSolidTabStore((state) => state.closeAllTabs);
  const [contextTabId, setContextTabId] = createSignal<string | null>(null);
  const tabRefs: TabRefsMap = {};
  let viewportRef: HTMLDivElement | undefined;

  const sortedTabIds = createMemo(() => tabs().map((tab) => tab.id));

  useTabBarOverflow({
    viewport: () => viewportRef,
    activeTabId,
    tabRefs,
  });

  createEffect(() => {
    const keep = new Set(sortedTabIds());
    for (const id of Object.keys(tabRefs)) {
      if (!keep.has(id)) {
        delete tabRefs[id];
      }
    }
  });

  const handleAuxClick = (event: MouseEvent, id: string) => {
    if (event.button === 1) {
      event.preventDefault();
      closeTab(id);
    }
  };

  const handleCloseTabsToRight = () => {
    const target = contextTabId();
    if (target) {
      closeTabsToRight(target);
    }
  };

  const handleCloseOtherTabs = () => {
    const target = contextTabId();
    if (target) {
      closeOtherTabs(target);
    }
  };
  const tabItems = keyArray(
    tabs,
    (tab) => tab.id,
    (tab) => (
      <HistoryTabItem
        active={tab().id === activeTabId()}
        tabId={tab().id}
        puuid={tab().puuid}
        sgpServerId={tab().sgpServerId}
        identity={tab().identity}
        onAuxClick={handleAuxClick}
        registerRef={(id, node) => {
          tabRefs[id] = node;
        }}
      />
    ),
  );

  return (
    <Menu.Root positioning={{ placement: "bottom-start", strategy: "fixed" }}>
      <div class={s.container}>
        <div
          data-scrollbar="hidden"
          data-tauri-drag-region
          class={s.viewport}
          ref={viewportRef}
        >
          <Menu.ContextTrigger
            asChild={(getTriggerProps) => (
              <ul
                {...getTriggerProps({
                  class: s.track,
                  onContextMenu: (event) => {
                    setContextTabId(getContextTabId(event));
                  },
                })}
              >
                {tabItems()}
              </ul>
            )}
          />
        </div>
      </div>
      <Portal>
        <Menu.Positioner class={s.contextMenuPositioner}>
          <Menu.Content class={s.contextMenuContent}>
            <Menu.Item
              class={s.contextMenuItem}
              value="close-right"
              onSelect={handleCloseTabsToRight}
              disabled={!contextTabId()}
            >
              {t("history.closeTabsToRight")}
            </Menu.Item>
            <Menu.Item
              class={s.contextMenuItem}
              value="close-others"
              onSelect={handleCloseOtherTabs}
              disabled={!contextTabId()}
            >
              {t("history.closeOtherTabs")}
            </Menu.Item>
            <Menu.Separator class={s.contextMenuSeparator} />
            <Menu.Item
              class={s.contextMenuItem}
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
