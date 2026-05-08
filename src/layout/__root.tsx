import { Portal } from "@ark-ui/react/portal";
import { Tooltip } from "@ark-ui/react/tooltip";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  cloneElement,
  isValidElement,
  lazy,
  Suspense,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useOutlet } from "react-router";
import { JaxLogo } from "@/components/JaxLogo";
import { TitleBar } from "@/components/TitleBar";
import {
  getNavItems,
  getSidebarSlots,
  getTitlebarSlots,
  getToolbarSlots,
} from "@/features/registry";
import { useWindowEffectBackgroundFallback } from "@/features/window-effect/use-window-effect";
import { useLcuEvents } from "@/hooks/use-lcu-events";
import { useTheme } from "@/hooks/use-theme";
import type { NavItem } from "@/runtime/web-contract";
import * as s from "./__root.css";

const DebugCommandPanel = import.meta.env.DEV
  ? lazy(() =>
      import("@/components/DebugCommandPanel").then((module) => ({
        default: module.DebugCommandPanel,
      })),
    )
  : null;

interface SidebarNavLinkProps extends NavItem {
  collapsed: boolean;
  label: string;
}

function getMainRouteKey(pathname: string): string {
  const [, layout, route] = pathname.split("/");
  if (!layout || !route) {
    return pathname;
  }

  return `/${layout}/${route}`;
}

function MainRouteOutlet({ pathname }: { pathname: string }) {
  const outlet = useOutlet();
  const reduceMotion = useReducedMotion();
  const routeKey = getMainRouteKey(pathname);

  return (
    <div className={s.routeTransitionSurface}>
      {outlet ? (
        <motion.div
          key={routeKey}
          className={s.routeLayer}
          initial={reduceMotion ? false : { opacity: 0.65 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.26, ease: "easeOut" }}
        >
          {outlet}
        </motion.div>
      ) : null}
    </div>
  );
}

function SidebarNavLink({
  to,
  icon: Icon,
  collapsed,
  label,
  endAdornment,
}: SidebarNavLinkProps) {
  const hasEndAdornment = !!endAdornment;
  const link = (
    <NavLink
      to={to}
      className={({ isActive }) =>
        s.navItem({
          collapsed,
          active: isActive,
          adorned: hasEndAdornment,
        })
      }
      draggable={false}
    >
      <Icon size={16} aria-hidden="true" className={s.navIcon({ collapsed })} />
      <span className={s.navLabel({ collapsed, adorned: hasEndAdornment })}>
        {label}
      </span>
      {endAdornment ? (
        <span className={s.navEndAdornment({ collapsed })}>{endAdornment}</span>
      ) : null}
    </NavLink>
  );

  return (
    <Tooltip.Root
      lazyMount
      unmountOnExit
      openDelay={200}
      closeDelay={0}
      positioning={{ placement: "right", gutter: 8 }}
    >
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      {collapsed ? (
        <Portal>
          <Tooltip.Positioner className={s.navTooltipPositioner}>
            <Tooltip.Content className={s.navTooltipContent}>
              {label}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Portal>
      ) : null}
    </Tooltip.Root>
  );
}

export function MainWindowLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useWindowEffectBackgroundFallback();
  useLcuEvents();
  useTheme();

  const iconSize = collapsed ? 20 : 16;
  const mainNavItems = useMemo(() => getNavItems("main"), []);
  const bottomNavItems = useMemo(() => getNavItems("bottom"), []);

  const toolbarSlots = useMemo(
    () =>
      getToolbarSlots(pathname).map((slot) => (
        <div key={slot.id} className={s.toolbarSlot}>
          {slot.node}
        </div>
      )),
    [pathname],
  );

  const titlebarSlots = useMemo(
    () =>
      getTitlebarSlots(pathname).map((slot) => {
        if (!isValidElement(slot.node)) {
          return slot.node;
        }

        return cloneElement(slot.node, { key: slot.id });
      }),
    [pathname],
  );

  const sidebarSlots = useMemo(
    () =>
      getSidebarSlots({
        currentPath: pathname,
        collapsed,
        iconSize,
      }),
    [collapsed, iconSize, pathname],
  );

  return (
    <div
      className={s.shell}
      style={assignInlineVars({
        [s.sidebarWidth]: collapsed
          ? `calc(${s.iconCol} + ${s.navPad} * 2) 1fr`
          : "12rem 1fr",
      })}
    >
      <div data-tauri-drag-region className={s.logoButton}>
        <button
          type="button"
          style={{ display: "grid", placeItems: "center" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <JaxLogo size={25} className={s.logoIcon} />
          {collapsed ? (
            <PanelLeftOpen
              size={25}
              aria-hidden="true"
              className={s.collapseIcon}
            />
          ) : (
            <PanelLeftClose
              size={25}
              aria-hidden="true"
              className={s.collapseIcon}
            />
          )}
        </button>
      </div>

      <TitleBar toolbarSlots={toolbarSlots} titlebarSlots={titlebarSlots} />

      <aside className={s.sidebar}>
        <nav className={s.navList}>
          {mainNavItems.map((item) => (
            <SidebarNavLink
              key={item.to}
              {...item}
              collapsed={collapsed}
              label={t(item.labelKey)}
            />
          ))}
        </nav>

        <div className={s.navList}>
          {sidebarSlots.map((slot) => (
            <div key={slot.id}>{slot.node}</div>
          ))}
          {bottomNavItems.map((item) => (
            <SidebarNavLink
              key={item.to}
              {...item}
              collapsed={collapsed}
              label={t(item.labelKey)}
            />
          ))}
        </div>
      </aside>

      <main className={s.main}>
        <MainRouteOutlet pathname={pathname} />
      </main>
      {DebugCommandPanel ? (
        <Suspense fallback={null}>
          <DebugCommandPanel />
        </Suspense>
      ) : null}
    </div>
  );
}
