import { assignInlineVars } from "@vanilla-extract/dynamic";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  cloneElement,
  isValidElement,
  lazy,
  Suspense,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation } from "react-router";
import { JaxLogo } from "@/components/JaxLogo";
import { TitleBar } from "@/components/TitleBar";
import {
  getNavItems,
  getSidebarSlots,
  getTitlebarSlots,
  getToolbarSlots,
} from "@/features/registry";
import { useLcuEvents } from "@/hooks/use-lcu-events";
import { useTheme } from "@/hooks/use-theme";
import { useWindowEffectBackgroundFallback } from "@/hooks/use-window-effect";
import * as s from "./__root.css";

const DebugCommandPanel = import.meta.env.DEV
  ? lazy(() =>
      import("@/components/DebugCommandPanel").then((module) => ({
        default: module.DebugCommandPanel,
      })),
    )
  : null;

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
        <div key={slot.id}>{slot.node}</div>
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
          {mainNavItems.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                s.navItem({ collapsed, active: isActive })
              }
              draggable={false}
            >
              <Icon size={iconSize} aria-hidden="true" className={s.navIcon} />
              <span className={s.navLabel({ collapsed })}>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className={s.navList}>
          {sidebarSlots.map((slot) => (
            <div key={slot.id}>{slot.node}</div>
          ))}
          {bottomNavItems.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                s.navItem({ collapsed, active: isActive })
              }
              draggable={false}
            >
              <Icon size={iconSize} aria-hidden="true" className={s.navIcon} />
              <span className={s.navLabel({ collapsed })}>{t(labelKey)}</span>
            </NavLink>
          ))}
        </div>
      </aside>

      <main className={s.main}>
        <Outlet />
      </main>
      {DebugCommandPanel ? (
        <Suspense fallback={null}>
          <DebugCommandPanel />
        </Suspense>
      ) : null}
    </div>
  );
}
