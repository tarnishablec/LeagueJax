/** @jsxImportSource solid-js */
import { Tooltip } from "@ark-ui/solid/tooltip";
import { keyArray } from "@solid-primitives/keyed";
import { A, useLocation } from "@solidjs/router";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { PanelLeftClose, PanelLeftOpen } from "lucide-solid";
import {
  children,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import { Motion } from "solid-motionone";
import { JaxLogo } from "@/components/JaxLogo";
import { TitleBar } from "@/components/TitleBar";
import {
  getSolidNavItems,
  getSolidSidebarSlots,
  getSolidTitlebarSlots,
  getSolidToolbarSlots,
} from "@/features/solid-registry";
import { useSolidWindowEffectBackgroundFallback } from "@/features/window-effect/use-window-effect";
import { useSolidLcuEvents } from "@/hooks/use-lcu-events.solid";
import { useSolidTheme } from "@/hooks/use-theme.solid";
import { useSolidTranslation } from "@/i18n/solid";
import type { SolidNavItem } from "@/runtime/solid-web-contract";
import * as s from "./__root.css.ts";

const SIDEBAR_TRANSITION_MS = 200;

interface SidebarNavLinkProps extends SolidNavItem {
  collapsed: boolean;
  label: string;
  showEndAdornment: boolean;
}

function getMainRouteKey(pathname: string): string {
  const [, layout, route] = pathname.split("/");
  if (!layout || !route) {
    return pathname;
  }

  return `/${layout}/${route}`;
}

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = createSignal(false);

  onMount(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    onCleanup(() => media.removeEventListener("change", sync));
  });

  return reduceMotion;
}

function MainRouteOutlet(props: {
  children?: JSX.Element;
  pathname: string;
}): JSX.Element {
  const routeContent = children(() => props.children);
  const reduceMotion = usePrefersReducedMotion();
  const routeKey = createMemo(() => getMainRouteKey(props.pathname));

  return (
    <div class={s.routeTransitionSurface}>
      <Show when={routeContent()}>
        <Show when={routeKey()} keyed>
          <Motion.div
            class={s.routeLayer}
            initial={reduceMotion() ? false : { opacity: 0.65 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.26, easing: "ease-out" }}
          >
            {routeContent()}
          </Motion.div>
        </Show>
      </Show>
    </div>
  );
}

function isNavItemActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function SidebarNavLink(props: SidebarNavLinkProps): JSX.Element {
  const location = useLocation();
  const isActive = createMemo(() =>
    isNavItemActive(location.pathname, props.to),
  );
  const visibleEndAdornment = () =>
    props.showEndAdornment ? props.endAdornment : null;
  const hasEndAdornment = () => !!visibleEndAdornment();
  const Icon = props.icon;

  return (
    <Tooltip.Root
      lazyMount
      unmountOnExit
      openDelay={200}
      closeDelay={0}
      positioning={{ placement: "right", gutter: 8 }}
    >
      <Tooltip.Trigger
        asChild={(getTriggerProps) => (
          <A
            {...getTriggerProps({
              class: s.navItem({
                collapsed: props.collapsed,
                active: isActive(),
                adorned: hasEndAdornment(),
              }),
              draggable: false,
            })}
            href={props.to}
          >
            <Icon
              size={16}
              aria-hidden="true"
              class={s.navIcon({ collapsed: props.collapsed })}
            />
            <span
              class={s.navLabel({
                collapsed: props.collapsed,
                adorned: hasEndAdornment(),
              })}
            >
              {props.label}
            </span>
            <Show when={visibleEndAdornment()}>
              {(endAdornment) => (
                <span
                  class={s.navEndAdornment({ collapsed: props.collapsed })}
                  data-collapsed={props.collapsed ? "true" : undefined}
                >
                  {endAdornment()}
                </span>
              )}
            </Show>
          </A>
        )}
      />
      <Show when={props.collapsed}>
        <Portal>
          <Tooltip.Positioner class={s.navTooltipPositioner}>
            <Tooltip.Content class={s.navTooltipContent}>
              {props.label}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Portal>
      </Show>
    </Tooltip.Root>
  );
}

export function MainWindowLayout(props: {
  children?: JSX.Element;
}): JSX.Element {
  const { t } = useSolidTranslation();
  const location = useLocation();
  const [collapsed, setCollapsed] = createSignal(false);
  const [showNavEndAdornment, setShowNavEndAdornment] = createSignal(true);
  let previousCollapsed = collapsed();

  useSolidWindowEffectBackgroundFallback();
  useSolidLcuEvents();
  useSolidTheme();

  createEffect(() => {
    const nextCollapsed = collapsed();
    if (previousCollapsed === nextCollapsed) {
      return;
    }

    previousCollapsed = nextCollapsed;
    setShowNavEndAdornment(false);
    const timer = window.setTimeout(() => {
      setShowNavEndAdornment(true);
    }, SIDEBAR_TRANSITION_MS);

    onCleanup(() => window.clearTimeout(timer));
  });

  const iconSize = createMemo(() => (collapsed() ? 20 : 16));
  const mainNavItems = createMemo(() => getSolidNavItems("main"));
  const bottomNavItems = createMemo(() => getSolidNavItems("bottom"));
  const toolbarSlots = createMemo(() =>
    getSolidToolbarSlots(location.pathname),
  );
  const titlebarSlots = createMemo(() =>
    getSolidTitlebarSlots(location.pathname),
  );
  const sidebarSlots = createMemo(() =>
    getSolidSidebarSlots({
      currentPath: location.pathname,
      collapsed: collapsed(),
      iconSize: iconSize(),
    }),
  );
  const toolbarSlotNodes = keyArray(
    toolbarSlots,
    (slot) => slot.id,
    (slot) => <div class={s.toolbarSlot}>{slot().node}</div>,
  );
  const titlebarSlotNodes = keyArray(
    titlebarSlots,
    (slot) => slot.id,
    (slot) => slot().node,
  );
  const mainNavNodes = keyArray(
    mainNavItems,
    (item) => item.to,
    (item) => (
      <SidebarNavLink
        {...item()}
        collapsed={collapsed()}
        label={t(item().labelKey)}
        showEndAdornment={showNavEndAdornment()}
      />
    ),
  );
  const sidebarSlotNodes = keyArray(
    sidebarSlots,
    (slot) => slot.id,
    (slot) => <div>{slot().node}</div>,
  );
  const bottomNavNodes = keyArray(
    bottomNavItems,
    (item) => item.to,
    (item) => (
      <SidebarNavLink
        {...item()}
        collapsed={collapsed()}
        label={t(item().labelKey)}
        showEndAdornment={showNavEndAdornment()}
      />
    ),
  );

  return (
    <div
      class={s.shell}
      data-tauri-drag-region
      style={assignInlineVars({
        [s.sidebarWidth]: collapsed()
          ? `calc(${s.iconCol} + ${s.navPad} * 2) 1fr`
          : "12rem 1fr",
      })}
    >
      <div data-tauri-drag-region class={s.logoButton}>
        <button
          type="button"
          style={{ display: "grid", "place-items": "center" }}
          aria-label={collapsed() ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <JaxLogo size={25} class={s.logoIcon} />
          <Show
            when={collapsed()}
            fallback={
              <PanelLeftClose
                size={25}
                aria-hidden="true"
                class={s.collapseIcon}
              />
            }
          >
            <PanelLeftOpen
              size={25}
              aria-hidden="true"
              class={s.collapseIcon}
            />
          </Show>
        </button>
      </div>

      <TitleBar
        toolbarSlots={toolbarSlotNodes()}
        titlebarSlots={titlebarSlotNodes()}
      />

      <aside class={s.sidebar}>
        <nav class={s.navList}>{mainNavNodes()}</nav>

        <div class={s.navList}>
          {sidebarSlotNodes()}
          {bottomNavNodes()}
        </div>
      </aside>

      <main class={s.main}>
        <MainRouteOutlet pathname={location.pathname}>
          {props.children}
        </MainRouteOutlet>
      </main>
    </div>
  );
}
