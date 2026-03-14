import { assignInlineVars } from "@vanilla-extract/dynamic";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router";
import { ClientStatus } from "../components/ClientStatus";
import { JaxLogo } from "../components/JaxLogo";
import { TitleBar } from "../components/TitleBar";
import { getNavItems } from "../features/registry";
import { useLcuEvents } from "../hooks/use-lcu-events";
import { useTheme } from "../hooks/use-theme";

import * as s from "./__root.css";

// ─── Layout ───────────────────────────────────────────────────────────────────

const mainNavItems = getNavItems("main");
const bottomNavItems = getNavItems("bottom");

export function RootLayout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  useLcuEvents();
  useTheme();

  const iconSize = collapsed ? 20 : 16;

  return (
    <div
      className={s.shell}
      style={assignInlineVars({
        [s.sidebarWidth]: collapsed
          ? `calc(${s.iconCol} + ${s.navPad} * 2) 1fr`
          : "12rem 1fr",
      })}
    >
      {/* ── Sidebar logo / collapse toggle ── */}
      <button
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={s.logoButton}
        onClick={() => setCollapsed((c) => !c)}
      >
        <JaxLogo size={20} className={s.logoIcon} />
        {collapsed ? (
          <PanelLeftOpen
            size={20}
            aria-hidden="true"
            className={s.collapseIcon}
          />
        ) : (
          <PanelLeftClose
            size={20}
            aria-hidden="true"
            className={s.collapseIcon}
          />
        )}
      </button>

      {/* ── Title bar ── */}
      <TitleBar />

      {/* ── Sidebar nav ── */}
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

        {/* ── Sidebar bottom ── */}
        <div className={s.navList}>
          <ClientStatus collapsed={collapsed} iconSize={iconSize} />
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

      {/* ── Main content ── */}
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  );
}
