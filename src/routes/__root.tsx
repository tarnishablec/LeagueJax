import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { Link2, PanelLeftClose, PanelLeftOpen, Unplug } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { JaxLogo } from "../components/JaxLogo";
import { ThemeToggle } from "../components/ThemeToggle";
import { TitleBar } from "../components/TitleBar";
import { getNavItems } from "../features/registry";
import { useLcuEvents } from "../hooks/use-lcu-events";
import { useTheme } from "../hooks/use-theme";
import { useLcuStore } from "../stores/lcu";

import * as s from "./__root.css";

// ─── Layout ───────────────────────────────────────────────────────────────────

const mainNavItems = getNavItems("main");
const bottomNavItems = getNavItems("bottom");

function RootLayout() {
  const { t } = useTranslation();
  const connected = useLcuStore((st) => st.connected);
  const summoner = useLcuStore((st) => st.summoner);
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
      <TitleBar tools={[<ThemeToggle key="theme-toggle" />]} />

      {/* ── Sidebar nav ── */}
      <aside className={s.sidebar}>
        <nav className={s.navList}>
          {mainNavItems.map(({ to, labelKey, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={s.navItem({ collapsed })}
              draggable={false}
              activeProps={{
                className: s.navItem({ collapsed, active: true }),
              }}
            >
              <Icon size={iconSize} aria-hidden="true" className={s.navIcon} />
              <span className={s.navLabel({ collapsed })}>{t(labelKey)}</span>
            </Link>
          ))}
        </nav>

        {/* ── Sidebar bottom ── */}
        <div className={s.navList}>
          {connected && summoner ? (
            <Link
              to="/history"
              className={s.navItem({ collapsed })}
              draggable={false}
              activeProps={{
                className: s.navItem({ collapsed, active: true }),
              }}
            >
              <Link2 size={iconSize} aria-hidden="true" className={s.navIcon} />
              <span className={s.navLabel({ collapsed })}>
                {summoner.gameName}#{summoner.tagLine}
              </span>
            </Link>
          ) : (
            <div className={s.navItem({ collapsed })}>
              <Unplug
                size={iconSize}
                aria-hidden="true"
                className={s.navIcon}
              />
              <span className={s.navLabel({ collapsed })}>
                {t("common.disconnected")}
              </span>
            </div>
          )}
          {bottomNavItems.map(({ to, labelKey, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={s.navItem({ collapsed })}
              draggable={false}
              activeProps={{
                className: s.navItem({ collapsed, active: true }),
              }}
            >
              <Icon size={iconSize} aria-hidden="true" className={s.navIcon} />
              <span className={s.navLabel({ collapsed })}>{t(labelKey)}</span>
            </Link>
          ))}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={s.main}>
        <Outlet />
      </main>

      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </div>
  );
}

export const Route = createRootRoute({ component: RootLayout });
